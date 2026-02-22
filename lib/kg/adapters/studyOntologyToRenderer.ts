type EntityCollection = "concepts" | "theories" | "persons" | "methods" | "assignments";

type CollectionConfig = {
  key: EntityCollection;
  type: string;
  layer: number;
};

const COLLECTIONS: CollectionConfig[] = [
  { key: "concepts", type: "Concept", layer: 1 },
  { key: "theories", type: "Theory", layer: 2 },
  { key: "methods", type: "Method", layer: 3 },
  { key: "assignments", type: "Assignment", layer: 4 },
  { key: "persons", type: "Person", layer: 5 },
];

export type RendererSource = {
  id: string;
  documentName: string;
  pageNumber: number;
  snippet: string;
};

export type RendererNode = {
  id: string;
  name: string;
  type: string;
  category_name: string;
  layer: number;
  description: string;
  sources: RendererSource[];
};

export type RendererLink = {
  id: string;
  source: string;
  target: string;
  type: string;
  predicate_name: string;
  confidence: number | null;
  source_id: number | null;
  content: Record<string, unknown>;
};

export type RendererGraph = {
  nodes: RendererNode[];
  links: RendererLink[];
};

function asArray<T = unknown>(input: unknown): T[] {
  return Array.isArray(input) ? (input as T[]) : [];
}

function toSnake(value: string): string {
  return value
    .trim()
    .replace(/[\s-]+/g, "_")
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase();
}

function normalizePredicate(predicate: unknown): string {
  if (typeof predicate !== "string" || !predicate.trim()) {
    return "connects_to";
  }

  const normalized = toSnake(predicate);
  return normalized || "connects_to";
}

function normalizeNodeId(entity: Record<string, unknown>, type: string, index: number): string {
  const rawId = entity.id;
  if (typeof rawId === "string" && rawId.trim()) {
    return rawId;
  }

  if (typeof rawId === "number" && Number.isFinite(rawId)) {
    return String(rawId);
  }

  const rawName = entity.name;
  if (typeof rawName === "string" && rawName.trim()) {
    return `${type}:${rawName.trim()}`;
  }

  return `${type}:node-${index + 1}`;
}

function toRendererSources(input: unknown): RendererSource[] {
  return asArray<Record<string, unknown>>(input).map((source, index) => {
    const rawName = source.document_name ?? source.documentName ?? source.name;
    const rawSnippet = source.snippet ?? source.text ?? source.quote;
    const rawPage = source.page_number ?? source.pageNumber;
    const sourceId = source.id;

    return {
      id:
        typeof sourceId === "string"
          ? sourceId
          : typeof sourceId === "number"
            ? String(sourceId)
            : `source-${index + 1}`,
      documentName: typeof rawName === "string" && rawName.trim() ? rawName : "Unknown source",
      pageNumber:
        typeof rawPage === "number" && Number.isFinite(rawPage)
          ? rawPage
          : typeof rawPage === "string" && Number.isFinite(Number(rawPage))
            ? Number(rawPage)
            : 1,
      snippet: typeof rawSnippet === "string" ? rawSnippet : "",
    };
  });
}

function inferRelationshipSourceId(relationship: Record<string, unknown>): number | null {
  const direct = relationship.source_id;
  if (typeof direct === "number" && Number.isFinite(direct)) return direct;
  if (typeof direct === "string" && Number.isFinite(Number(direct))) return Number(direct);

  const provenance = asArray<Record<string, unknown>>(relationship.provenance);
  const first = provenance[0] ?? {};
  const candidate = first.source_document_id ?? first.source_id ?? first.document_id;

  if (typeof candidate === "number" && Number.isFinite(candidate)) return candidate;
  if (typeof candidate === "string" && Number.isFinite(Number(candidate))) return Number(candidate);
  return null;
}

function inferConfidence(relationship: Record<string, unknown>): number | null {
  const raw = relationship.confidence ?? relationship.score;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string" && Number.isFinite(Number(raw))) return Number(raw);
  return null;
}

export function isKnowledgeGraphPayload(payload: unknown): payload is Record<string, unknown> {
  if (!payload || typeof payload !== "object") return false;
  const obj = payload as Record<string, unknown>;
  if (!Array.isArray(obj.relationships)) return false;
  return COLLECTIONS.some((collection) => Array.isArray(obj[collection.key]));
}

export function isRendererGraphPayload(payload: unknown): payload is RendererGraph {
  if (!payload || typeof payload !== "object") return false;
  const obj = payload as Record<string, unknown>;
  return Array.isArray(obj.nodes) && Array.isArray(obj.links);
}

export function studyOntologyToRendererGraph(payload: unknown): RendererGraph {
  if (!isKnowledgeGraphPayload(payload)) {
    return { nodes: [], links: [] };
  }

  const graph = payload as Record<string, unknown>;
  const nodes: RendererNode[] = [];
  const nodeIds = new Set<string>();

  for (const collection of COLLECTIONS) {
    const entities = asArray<Record<string, unknown>>(graph[collection.key]);
    entities.forEach((entity, index) => {
      const id = normalizeNodeId(entity, collection.type, index);
      if (nodeIds.has(id)) return;

      const rawName = entity.name;
      const rawDescription = entity.description;

      const node: RendererNode = {
        id,
        name:
          typeof rawName === "string" && rawName.trim()
            ? rawName
            : `${collection.type} ${nodes.length + 1}`,
        type: collection.type,
        category_name: collection.type,
        layer: collection.layer,
        description: typeof rawDescription === "string" ? rawDescription : "",
        sources: toRendererSources(entity.sources),
      };

      nodeIds.add(id);
      nodes.push(node);
    });
  }

  const links: RendererLink[] = [];
  const relationships = asArray<Record<string, unknown>>(graph.relationships);

  relationships.forEach((relationship) => {
    const subject = relationship.subject ?? relationship.source ?? relationship.subject_id;
    const object = relationship.object ?? relationship.target ?? relationship.object_id;

    const source =
      typeof subject === "string"
        ? subject
        : typeof subject === "number"
          ? String(subject)
          : "";

    const target =
      typeof object === "string"
        ? object
        : typeof object === "number"
          ? String(object)
          : "";

    if (!source || !target) return;
    if (!nodeIds.has(source) || !nodeIds.has(target)) return;

    const type = normalizePredicate(relationship.predicate ?? relationship.type);
    const link: RendererLink = {
      id: `e:${source}|${type}|${target}`,
      source,
      target,
      type,
      predicate_name: type,
      confidence: inferConfidence(relationship),
      source_id: inferRelationshipSourceId(relationship),
      content: relationship,
    };

    links.push(link);
  });

  return { nodes, links };
}
