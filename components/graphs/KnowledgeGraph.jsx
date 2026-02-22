"use client";

import { useState, useMemo, useCallback, useEffect } from "react";


import { buildLayout } from "./layout";

import GlobalStyles from "./GlobalStyles";
import DotGridBackground from "./DotGridBackground";
import Topbar from "./Topbar";
import GraphCanvas from "./GraphCanvas";
import GraphSvg from "./GraphSvg";
import NodeCards from "./NodeCards";
import DetailPanel from "./DetailPanel";

export default function KnowledgeGraph({ graphData }) {
  const [hovered, setHovered] = useState(null);
  const [selected, setSelected] = useState(null);
  const [typeFilter, setTypeFilter] = useState("all");
  const [maxLayer, setMaxLayer] = useState(5);
  const [zoom, setZoom] = useState(0.68);
  const [pan, setPan] = useState({ x: 60, y: 30 });
  const [dragging, setDragging] = useState(false);
  const [dragFrom, setDragFrom] = useState({ x: 0, y: 0 });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => (t + 1) % 200), 50);
    return () => clearInterval(id);
  }, []);

  const { nodes, links, totalLayerCount } = useMemo(() => {
    const sourceNodes = Array.isArray(graphData?.nodes) ? graphData.nodes : [];
    const sourceLinks = Array.isArray(graphData?.links) ? graphData.links : [];

    const nodes = sourceNodes.filter(
      (n) =>
        n.layer <= maxLayer && (typeFilter === "all" || n.type === typeFilter),
    );
    const ids = new Set(nodes.map((n) => n.id));

    return {
      nodes,
      links: sourceLinks.filter(
        (l) => ids.has(l.source) && ids.has(l.target),
      ),
      totalLayerCount: [...new Set(sourceNodes.map((n) => n.layer))].length,
    };
  }, [graphData, typeFilter, maxLayer]);

  const layout = useMemo(() => buildLayout(nodes), [nodes]);

  const { hlNodes, hlLinks } = useMemo(() => {
    if (!hovered) return { hlNodes: new Set(), hlLinks: new Set() };
    const ns = new Set([hovered]);
    const ls = new Set();
    const walk = (id, depth) => {
      if (depth > 4) return;
      links.forEach((l) => {
        if ((l.source === id || l.target === id) && !ls.has(l)) {
          ls.add(l);
          const next = l.source === id ? l.target : l.source;
          if (!ns.has(next)) {
            ns.add(next);
            walk(next, depth + 1);
          }
        }
      });
    };
    walk(hovered, 0);
    return { hlNodes: ns, hlLinks: ls };
  }, [hovered, links]);

  const presentLayers = useMemo(
    () => [...new Set(nodes.map((n) => n.layer))].sort((a, b) => a - b),
    [nodes],
  );

  const onWheel = useCallback((e) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    setZoom((z) =>
      Math.min(2, Math.max(0.25, z * (e.deltaY < 0 ? 1.09 : 0.91))),
    );
  }, []);

  const reset = useCallback(() => {
    setZoom(0.68);
    setPan({ x: 60, y: 30 });
  }, []);

  return (
    <div
      style={{
        width: "100%",
        height: "100vh",
        overflow: "hidden",
        background: "#07090f",
        fontFamily: "'Sora','DM Sans','Segoe UI',sans-serif",
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}
    >
      <GlobalStyles />
      <DotGridBackground />

      <Topbar
        nodesCount={nodes.length}
        linksCount={links.length}
        typeFilter={typeFilter}
        setTypeFilter={setTypeFilter}
        maxLayer={maxLayer}
        setMaxLayer={setMaxLayer}
        totalLayerCount={totalLayerCount}
        zoom={zoom}
        setZoom={setZoom}
        reset={reset}
      />

      <GraphCanvas
        dragging={dragging}
        setDragging={setDragging}
        dragFrom={dragFrom}
        setDragFrom={setDragFrom}
        pan={pan}
        setPan={setPan}
        zoom={zoom}
        onWheel={onWheel}
        selected={selected}
      >
        <GraphSvg
          presentLayers={presentLayers}
          links={links}
          layout={layout}
          hovered={hovered}
          hlLinks={hlLinks}
          tick={tick}
        />

        <NodeCards
          nodes={nodes}
          layout={layout}
          hovered={hovered}
          setHovered={setHovered}
          selected={selected}
          setSelected={setSelected}
          hlNodes={hlNodes}
        />
      </GraphCanvas>

      <DetailPanel
        selected={selected}
        setSelected={setSelected}
        graphData={graphData}
      />
    </div>
  );
}
