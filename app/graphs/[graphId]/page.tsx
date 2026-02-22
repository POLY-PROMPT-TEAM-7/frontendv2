"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { KnowledgeGraph } from "../../../components/graphs";

type GraphPayload = {
  nodes: Array<{
    id: string;
    name: string;
    type: string;
    layer: number;
    description: string;
    sources: Array<{
      id: string;
      documentName: string;
      pageNumber: number;
      snippet: string;
    }>;
  }>;
  links: Array<{
    source: string;
    target: string;
    type: string;
  }>;
};

function isRendererGraph(value: unknown): value is GraphPayload {
  if (!value || typeof value !== "object") return false;
  const candidate = value as { nodes?: unknown; links?: unknown };
  if (!Array.isArray(candidate.nodes) || !Array.isArray(candidate.links)) {
    return false;
  }

  const nodesOk = candidate.nodes.every((node) => {
    if (!node || typeof node !== "object") return false;
    const n = node as Record<string, unknown>;
    return (
      typeof n.id === "string" &&
      typeof n.name === "string" &&
      typeof n.type === "string" &&
      typeof n.layer === "number" &&
      typeof n.description === "string" &&
      Array.isArray(n.sources)
    );
  });

  const linksOk = candidate.links.every((link) => {
    if (!link || typeof link !== "object") return false;
    const l = link as Record<string, unknown>;
    return (
      typeof l.source === "string" &&
      typeof l.target === "string" &&
      typeof l.type === "string"
    );
  });

  return nodesOk && linksOk;
}

export default function GraphByIdPage() {
  const params = useParams<{ graphId: string }>();
  const graphId = typeof params?.graphId === "string" ? params.graphId : "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [graphData, setGraphData] = useState<GraphPayload | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadGraph() {
      if (!graphId) {
        if (mounted) {
          setError("Missing graph id.");
          setLoading(false);
        }
        return;
      }

      if (graphId.startsWith("local-")) {
        const stored = sessionStorage.getItem(`kg:graph:${graphId}`);
        if (!stored) {
          if (mounted) {
            setError("No local graph found for this id.");
            setLoading(false);
          }
          return;
        }

        try {
          const parsed = JSON.parse(stored);
          if (!isRendererGraph(parsed)) {
            throw new Error("Stored graph payload is invalid.");
          }
          if (mounted) {
            setGraphData(parsed);
            setLoading(false);
          }
          return;
        } catch {
          if (mounted) {
            setError("Stored local graph is corrupted.");
            setLoading(false);
          }
          return;
        }
      }

      try {
        const res = await fetch(`/api/kg/graph/${encodeURIComponent(graphId)}`, {
          cache: "no-store",
        });
        const payload = await res.json().catch(() => null);

        if (!res.ok || !payload || payload.ok !== true) {
          const message =
            payload && typeof payload === "object" && payload.error?.message
              ? String(payload.error.message)
              : `Failed to load graph (${res.status})`;
          if (mounted) {
            setError(message);
            setLoading(false);
          }
          return;
        }

        if (!isRendererGraph(payload.rendererGraph)) {
          if (mounted) {
            setError("Graph payload from backend is invalid.");
            setLoading(false);
          }
          return;
        }

        if (mounted) {
          setGraphData(payload.rendererGraph);
          setLoading(false);
        }
      } catch (fetchError) {
        const message = fetchError instanceof Error ? fetchError.message : "Graph request failed.";
        if (mounted) {
          setError(message);
          setLoading(false);
        }
      }
    }

    setLoading(true);
    setError(null);
    setGraphData(null);
    void loadGraph();

    return () => {
      mounted = false;
    };
  }, [graphId]);

  const message = useMemo(() => {
    if (loading) return "Loading graph...";
    if (error) return error;
    return null;
  }, [loading, error]);

  if (message) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#07090f",
          color: "#cbd5e1",
          padding: 24,
          fontFamily: "'Sora','DM Sans','Segoe UI',sans-serif",
        }}
      >
        <div
          style={{
            maxWidth: 520,
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 12,
            background: "rgba(15,23,42,0.5)",
            padding: 20,
          }}
        >
          <h1 style={{ fontSize: 18, margin: 0, marginBottom: 10 }}>Knowledge Graph</h1>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6 }}>{message}</p>
        </div>
      </main>
    );
  }

  return <KnowledgeGraph graphData={graphData ?? undefined} />;
}
