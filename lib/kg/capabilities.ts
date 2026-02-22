export type FileField = "file" | "files" | "files[]";

export type Capabilities = {
  hasOpenAPI: boolean;
  extractMultipartEndpoint?: {
    path: string;
    method: "post" | "put";
    fileField: FileField;
  };
  extractJsonEndpoint?: {
    path: string;
    method: "post" | "put";
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

function countPathParams(pathTemplate: string): { count: number; first?: string } {
  const matches = Array.from(pathTemplate.matchAll(/\{([^}]+)\}/g));
  return { count: matches.length, first: matches[0]?.[1] };
}

export function deriveBackendCapabilities(openapi: unknown): Capabilities {
  const doc = asRecord(openapi) as OpenApiDoc | null;
  const paths = doc && asRecord(doc.paths) ? (doc.paths as Record<string, unknown>) : null;
  if (!paths) return { hasOpenAPI: false };

  const caps: Capabilities = { hasOpenAPI: true };

  let bestMultipart:
    | {
        priority: 1 | 2 | 3;
        path: string;
        method: "post" | "put";
        fileField: FileField;
      }
    | undefined;

  for (const [pathTemplate, pathItem] of Object.entries(paths)) {
    for (const method of ["post", "put"] as const) {
      const op = getOperation(pathItem, method);
      if (!op) continue;

      const mpSchema = getSchemaForContent(doc ?? {}, op, "multipart/form-data");
      const mpProps = asRecord(asRecord(mpSchema)?.properties);
      if (mpProps) {
        const filesSchema = derefSchema(doc ?? {}, mpProps.files, new Set());
        const filesArrSchema = derefSchema(doc ?? {}, mpProps["files[]"], new Set());
        const fileSchema = derefSchema(doc ?? {}, mpProps.file, new Set());

        if (looksLikeBinaryFileArray(filesSchema)) {
          const candidate = {
            priority: 1 as const,
            path: pathTemplate,
            method,
            fileField: "files" as const,
          };
          if (!bestMultipart || candidate.priority < bestMultipart.priority) {
            bestMultipart = candidate;
          }
        } else if (looksLikeBinaryFileArray(filesArrSchema)) {
          const candidate = {
            priority: 2 as const,
            path: pathTemplate,
            method,
            fileField: "files[]" as const,
          };
          if (!bestMultipart || candidate.priority < bestMultipart.priority) {
            bestMultipart = candidate;
          }
        } else if (looksLikeBinaryFile(fileSchema)) {
          const candidate = {
            priority: 3 as const,
            path: pathTemplate,
            method,
            fileField: "file" as const,
          };
          if (!bestMultipart || candidate.priority < bestMultipart.priority) {
            bestMultipart = candidate;
          }
        }
      }

      const jsonSchema = getSchemaForContent(doc ?? {}, op, "application/json");
      const jsonProps = asRecord(asRecord(jsonSchema)?.properties);
      if (!caps.extractJsonEndpoint && jsonProps && "text_path" in jsonProps) {
        caps.extractJsonEndpoint = { path: pathTemplate, method };
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

  if (bestMultipart) {
    caps.extractMultipartEndpoint = {
      path: bestMultipart.path,
      method: bestMultipart.method,
      fileField: bestMultipart.fileField,
    };
  }

  return caps;
}
