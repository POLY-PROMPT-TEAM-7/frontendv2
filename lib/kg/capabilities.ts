export type FileField = "file" | "files" | "files[]";
type WriteMethod = "post" | "put";

export type Capabilities = {
  hasOpenAPI: boolean;
  uploadMultipartEndpoint?: {
    path: string;
    method: WriteMethod;
    fileField: FileField;
  };
  extractJsonEndpoint?: {
    path: string;
    method: WriteMethod;
    requestField: "artifact_path" | "text_path" | "text";
  };
  relationshipsListEndpoint?: {
    path: string;
    method: "get";
  };
  subgraphBySourceEndpoint?: {
    pathTemplate: string;
    method: "get";
    sourceIdParam: string;
  };
  graphGetEndpoint?: {
    pathTemplate: string;
    method: "get";
    idParam: string;
  };
};

type OpenApiDoc = {
  paths?: Record<string, unknown>;
  components?: Record<string, unknown>;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function resolveRef(openapi: OpenApiDoc, ref: string): unknown {
  if (!ref.startsWith("#/")) return undefined;

  const parts = ref
    .slice(2)
    .split("/")
    .map((p) => decodeURIComponent(p));

  let cursor: unknown = openapi;
  for (const part of parts) {
    const rec = asRecord(cursor);
    if (!rec) return undefined;
    cursor = rec[part];
  }

  return cursor;
}

function derefSchema(openapi: OpenApiDoc, schema: unknown, seen: Set<string>): unknown {
  const rec = asRecord(schema);
  if (!rec) return schema;

  const ref = typeof rec.$ref === "string" ? rec.$ref : undefined;
  if (!ref) return schema;
  if (seen.has(ref)) return {};

  seen.add(ref);
  return derefSchema(openapi, resolveRef(openapi, ref), seen);
}

function getOperation(pathItem: unknown, method: "get" | "post" | "put"): Record<string, unknown> | null {
  const rec = asRecord(pathItem);
  if (!rec) return null;
  return asRecord(rec[method]);
}

function getSchemaForContent(
  openapi: OpenApiDoc,
  operation: Record<string, unknown> | null,
  contentType: string
): unknown {
  if (!operation) return undefined;
  const requestBody = asRecord(operation.requestBody);
  const content = requestBody ? asRecord(requestBody.content) : null;
  const media = content ? asRecord(content[contentType]) : null;
  const schema = media?.schema;
  return derefSchema(openapi, schema, new Set());
}

function looksLikeBinaryFile(schema: unknown): boolean {
  const rec = asRecord(schema);
  if (!rec) return false;
  return rec.type === "string" && rec.format === "binary";
}

function looksLikeBinaryFileArray(schema: unknown): boolean {
  const rec = asRecord(schema);
  if (!rec) return false;
  return rec.type === "array" && looksLikeBinaryFile(rec.items);
}

function toLowerPath(pathTemplate: string): string {
  return pathTemplate.trim().toLowerCase();
}

function hasProp(record: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function uploadPriority(pathTemplate: string, fileField: FileField): number {
  const lower = toLowerPath(pathTemplate);
  let score = 100;
  if (lower === "/upload") score -= 50;
  else if (lower.includes("upload")) score -= 20;

  if (fileField === "file") score -= 10;
  else if (fileField === "files") score -= 5;

  return score;
}

function extractPriority(pathTemplate: string, field: "artifact_path" | "text_path" | "text"): number {
  const lower = toLowerPath(pathTemplate);
  let score = 100;
  if (lower === "/extract") score -= 50;
  else if (lower.includes("extract")) score -= 20;

  if (field === "artifact_path") score -= 10;
  else if (field === "text_path") score -= 5;

  return score;
}

function countPathParams(pathTemplate: string): { count: number; first?: string } {
  const matches = Array.from(pathTemplate.matchAll(/\{([^}]+)\}/g));
  return { count: matches.length, first: matches[0]?.[1] };
}

export function deriveBackendCapabilities(openapi: unknown): Capabilities {
  const doc = asRecord(openapi) as OpenApiDoc | null;
  const paths = doc && asRecord(doc.paths) ? (doc.paths as Record<string, unknown>) : null;
  if (!paths) return { hasOpenAPI: false };

  const caps: Capabilities = { hasOpenAPI: true };

  let bestUpload:
    | {
        score: number;
        path: string;
        method: WriteMethod;
        fileField: FileField;
      }
    | undefined;

  let bestExtract:
    | {
        score: number;
        path: string;
        method: WriteMethod;
        requestField: "artifact_path" | "text_path" | "text";
      }
    | undefined;

  for (const [pathTemplate, pathItem] of Object.entries(paths)) {
    const pathLower = toLowerPath(pathTemplate);

    for (const method of ["post", "put"] as const) {
      const op = getOperation(pathItem, method);
      if (!op) continue;

      const mpSchema = getSchemaForContent(doc ?? {}, op, "multipart/form-data");
      const mpProps = asRecord(asRecord(mpSchema)?.properties);
      if (mpProps) {
        const fileSchema = derefSchema(doc ?? {}, mpProps.file, new Set());
        const filesSchema = derefSchema(doc ?? {}, mpProps.files, new Set());
        const filesArrSchema = derefSchema(doc ?? {}, mpProps["files[]"], new Set());

        const fileField = looksLikeBinaryFile(fileSchema)
          ? ("file" as const)
          : looksLikeBinaryFileArray(filesSchema)
            ? ("files" as const)
            : looksLikeBinaryFileArray(filesArrSchema)
              ? ("files[]" as const)
              : null;

        if (fileField) {
          const score = uploadPriority(pathTemplate, fileField);
          const candidate = {
            score,
            path: pathTemplate,
            method,
            fileField,
          };
          if (!bestUpload || candidate.score < bestUpload.score) {
            bestUpload = candidate;
          }
        }
      }

      const jsonSchema = getSchemaForContent(doc ?? {}, op, "application/json");
      const jsonProps = asRecord(asRecord(jsonSchema)?.properties);
      if (jsonProps) {
        const requestField: "artifact_path" | "text_path" | "text" | null =
          hasProp(jsonProps, "artifact_path")
            ? "artifact_path"
            : hasProp(jsonProps, "text_path")
              ? "text_path"
              : hasProp(jsonProps, "text")
                ? "text"
                : null;

        if (requestField) {
          const score = extractPriority(pathTemplate, requestField);
          const candidate = {
            score,
            path: pathTemplate,
            method,
            requestField,
          };
          if (!bestExtract || candidate.score < bestExtract.score) {
            bestExtract = candidate;
          }
        }
      }
    }

    if (!caps.relationshipsListEndpoint) {
      const getOperationValue = getOperation(pathItem, "get");
      if (getOperationValue && pathLower === "/query/relationships") {
        caps.relationshipsListEndpoint = {
          path: pathTemplate,
          method: "get",
        };
      }
    }

    if (!caps.subgraphBySourceEndpoint) {
      const getOperationValue = getOperation(pathItem, "get");
      if (
        getOperationValue &&
        pathLower.includes("/query/subgraph/source/")
      ) {
        const { count, first } = countPathParams(pathTemplate);
        if (count === 1 && first) {
          caps.subgraphBySourceEndpoint = {
            pathTemplate,
            method: "get",
            sourceIdParam: first,
          };
        }
      }
    }

    if (!caps.graphGetEndpoint) {
      const getOperationValue = getOperation(pathItem, "get");
      if (getOperationValue && pathTemplate.toLowerCase().includes("graph")) {
        const { count, first } = countPathParams(pathTemplate);
        if (count === 1 && first) {
          caps.graphGetEndpoint = {
            pathTemplate,
            method: "get",
            idParam: first,
          };
        }
      }
    }
  }

  if (bestUpload) {
    caps.uploadMultipartEndpoint = {
      path: bestUpload.path,
      method: bestUpload.method,
      fileField: bestUpload.fileField,
    };
  }

  if (bestExtract) {
    caps.extractJsonEndpoint = {
      path: bestExtract.path,
      method: bestExtract.method,
      requestField: bestExtract.requestField,
    };
  }

  return caps;
}
