import type {
  RendererGraph,
  RendererLink,
  RendererNode,
  RendererSource,
} from "./studyOntologyToRenderer";

type EntityRecord = {
  entity_id?: unknown;
  entity_name?: unknown;
  entity_type?: unknown;
  data?: unknown;
};

type RelationshipRecord = {
  subject_entity_id?: unknown;
  object_entity_id?: unknown;
  relationship_type?: unknown;
  confidence?: unknown;
  data?: unknown;
};

type SourceRecord = {
  source_id?: unknown;
  source_name?: unknown;
  data?: unknown;
};

type GraphSubgraphPayload = {
  entities?: unknown;
  relationships?: unknown;
  sources?: unknown;
};

type RelationshipsListPayload = {
  items?: unknown;
};

function asArray<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") return {};
  return value as Record<string, unknown>;
}

function asString(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

function toSnake(input: string): string {
  return input
    .trim()
    .replace(/[\s-]+/g, "_")
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase();
}

function normalizeType(input: unknown): string {
  const raw = asString(input, "connects_to");
  const normalized = toSnake(raw);
  return normalized || "connects_to";
}

function layerForEntityType(entityType: string): number {
  const normalized = entityType.trim().toLowerCase();
  if (normalized === "concept") return 1;
  if (normalized === "theory") return 2;
  if (normalized === "method") return 3;
  if (normalized === "assignment") return 4;
  if (normalized === "person") return 5;
  return 6;
}

function collectSourceIds(data: Record<string, unknown>): string[] {
  const ids = new Set<string>();
  const direct = [
    data.source_id,
    data.sourceId,
    data.source_document_id,
    data.sourceDocumentId,
  ];

  for (const value of direct) {
    const id = asString(value).trim();
    if (id) ids.add(id);
  }

  for (const value of asArray<unknown>(data.source_ids)) {
    const id = asString(value).trim();
    if (id) ids.add(id);
  }

  for (const value of asArray<unknown>(data.sourceIds)) {
    const id = asString(value).trim();
    if (id) ids.add(id);
  }

  return Array.from(ids);
}

function sourceFromRecord(source: SourceRecord, index: number): RendererSource {
  const sourceData = asRecord(source.data);
  const id = asString(source.source_id).trim() || `source-${index + 1}`;
  const pageNumber =
    asNumber(sourceData.page_number) ?? asNumber(sourceData.pageNumber) ?? 1;
  const snippet =
    asString(sourceData.snippet) ||
    asString(sourceData.quote) ||
    asString(sourceData.text);

  return {
    id,
    documentName: asString(source.source_name).trim() || "Unknown source",
    pageNumber,
    snippet,
  };
}

export function backendSubgraphToRendererGraph(payload: unknown): RendererGraph {
  const graph = asRecord(payload as GraphSubgraphPayload);

  const sourceMap = new Map<string, RendererSource>();
  asArray<SourceRecord>(graph.sources).forEach((source, index) => {
    const mapped = sourceFromRecord(source, index);
    sourceMap.set(mapped.id, mapped);
  });

  const nodes: RendererNode[] = [];
  const nodeIdSet = new Set<string>();

  asArray<EntityRecord>(graph.entities).forEach((entity, index) => {
    const id = asString(entity.entity_id).trim() || `entity-${index + 1}`;
    if (nodeIdSet.has(id)) return;

    const type = asString(entity.entity_type).trim() || "Entity";
    const entityData = asRecord(entity.data);

    const nodeSources = collectSourceIds(entityData)
      .map((sourceId) => sourceMap.get(sourceId))
      .filter((source): source is RendererSource => Boolean(source));

    nodes.push({
      id,
      name: asString(entity.entity_name).trim() || id,
      type,
      category_name: type,
      layer: layerForEntityType(type),
      description: asString(entityData.description),
      sources: nodeSources,
    });
    nodeIdSet.add(id);
  });

  const links: RendererLink[] = [];
  asArray<RelationshipRecord>(graph.relationships).forEach((relationship, index) => {
    const source = asString(relationship.subject_entity_id).trim();
    const target = asString(relationship.object_entity_id).trim();
    if (!source || !target) return;
    if (!nodeIdSet.has(source) || !nodeIdSet.has(target)) return;

    const relType = normalizeType(relationship.relationship_type);
    const relationshipData = asRecord(relationship.data);
    const sourceId = asNumber(relationshipData.source_id) ?? asNumber(relationshipData.sourceId);

    links.push({
      id: `e:${source}|${relType}|${target}|${index + 1}`,
      source,
      target,
      type: relType,
      predicate_name: relType,
      confidence: asNumber(relationship.confidence),
      source_id: sourceId,
      content: {
        ...relationshipData,
        relationship_type: asString(relationship.relationship_type),
      },
    });
  });

  return { nodes, links };
}

function ensureNode(
  nodes: RendererNode[],
  nodeIds: Set<string>,
  nodeId: string,
): void {
  if (!nodeId || nodeIds.has(nodeId)) return;

  const inferredType = nodeId.includes(":")
    ? nodeId.split(":", 1)[0]
    : "Entity";
  const label = nodeId.includes(":") ? nodeId.split(":").slice(1).join(":") : nodeId;
  const prettyType = inferredType.charAt(0).toUpperCase() + inferredType.slice(1);

  nodes.push({
    id: nodeId,
    name: label || nodeId,
    type: prettyType,
    category_name: prettyType,
    layer: layerForEntityType(prettyType),
    description: "",
    sources: [],
  });
  nodeIds.add(nodeId);
}

export function backendRelationshipsToRendererGraph(payload: unknown): RendererGraph {
  const body = asRecord(payload as RelationshipsListPayload);
  const items = asArray<RelationshipRecord>(body.items);

  const nodes: RendererNode[] = [];
  const nodeIds = new Set<string>();
  const links: RendererLink[] = [];

  items.forEach((relationship, index) => {
    const source = asString(relationship.subject_entity_id).trim();
    const target = asString(relationship.object_entity_id).trim();
    if (!source || !target) return;

    ensureNode(nodes, nodeIds, source);
    ensureNode(nodes, nodeIds, target);

    const relType = normalizeType(relationship.relationship_type);
    const relationshipData = asRecord(relationship.data);
    const sourceId = asNumber(relationshipData.source_id) ?? asNumber(relationshipData.sourceId);

    links.push({
      id: `r:${source}|${relType}|${target}|${index + 1}`,
      source,
      target,
      type: relType,
      predicate_name: relType,
      confidence: asNumber(relationship.confidence),
      source_id: sourceId,
      content: {
        ...relationshipData,
        relationship_type: asString(relationship.relationship_type),
      },
    });
  });

  return { nodes, links };
}
