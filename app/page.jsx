"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";

// ─── Sample Data (matches GraphData schema exactly) ──────────────────────────
const GRAPH_DATA = {
  nodes: [
    // Layer 1 — Core concepts
    {
      id: "n1",
      name: "Photosynthesis",
      type: "Concept",
      layer: 1,
      description:
        "The process by which plants and algae convert light energy into chemical energy, producing glucose and oxygen.",
      sources: [
        {
          id: "s1",
          documentName: "Campbell Biology, 11th Ed.",
          pageNumber: 186,
          snippet:
            "Photosynthesis is the process that converts solar energy into chemical energy, storing it in the bonds of sugar.",
        },
        {
          id: "s2",
          documentName: "Lecture Notes — Week 4",
          pageNumber: 3,
          snippet:
            "Overall equation: 6CO₂ + 6H₂O + light energy → C₆H₁₂O₆ + 6O₂",
        },
      ],
    },
    {
      id: "n2",
      name: "ATP",
      type: "Concept",
      layer: 1,
      description:
        "Adenosine triphosphate — the universal energy currency of the cell, powering virtually every cellular process.",
      sources: [
        {
          id: "s3",
          documentName: "Campbell Biology, 11th Ed.",
          pageNumber: 144,
          snippet:
            "ATP is the energy currency that drives cellular work when its terminal phosphate group is transferred to other molecules.",
        },
      ],
    },

    // Layer 2 — Structures
    {
      id: "n3",
      name: "Chloroplast",
      type: "Concept",
      layer: 2,
      description:
        "The organelle in plant cells where photosynthesis occurs, containing stacked thylakoid membranes surrounded by stroma.",
      sources: [
        {
          id: "s4",
          documentName: "Cell Biology Review",
          pageNumber: 88,
          snippet:
            "Chloroplasts contain an elaborate system of membranes that increases the surface area for light reactions.",
        },
      ],
    },
    {
      id: "n4",
      name: "Thylakoid Membrane",
      type: "Concept",
      layer: 2,
      description:
        "The internal membrane system of the chloroplast where the light-dependent reactions occur.",
      sources: [],
    },
    {
      id: "n5",
      name: "Stroma",
      type: "Concept",
      layer: 2,
      description:
        "The fluid-filled space surrounding the thylakoids where the Calvin cycle takes place.",
      sources: [
        {
          id: "s5",
          documentName: "Campbell Biology, 11th Ed.",
          pageNumber: 190,
          snippet:
            "The stroma is the site of carbon fixation reactions, containing the enzymes needed for the Calvin cycle.",
        },
      ],
    },

    // Layer 3 — Processes
    {
      id: "n6",
      name: "Light Reactions",
      type: "Concept",
      layer: 3,
      description:
        "The first stage of photosynthesis that captures solar energy to produce ATP and NADPH while splitting water.",
      sources: [
        {
          id: "s6",
          documentName: "Lecture Notes — Week 5",
          pageNumber: 7,
          snippet:
            "Light reactions occur in the thylakoid membrane and require direct light input to drive electron flow.",
        },
      ],
    },
    {
      id: "n7",
      name: "Calvin Cycle",
      type: "Concept",
      layer: 3,
      description:
        "The light-independent reactions in the stroma that use ATP and NADPH to fix CO₂ into glyceraldehyde-3-phosphate.",
      sources: [
        {
          id: "s7",
          documentName: "Biochemistry, 8th Ed.",
          pageNumber: 616,
          snippet:
            "Each complete turn of the Calvin cycle fixes one CO₂ molecule, requiring 3 ATP and 2 NADPH.",
        },
        {
          id: "s8",
          documentName: "Lecture Notes — Week 5",
          pageNumber: 11,
          snippet:
            "The Calvin cycle is not truly 'dark' — several enzymes are light-activated.",
        },
      ],
    },
    {
      id: "n8",
      name: "Electron Transport Chain",
      type: "Method",
      layer: 3,
      description:
        "A series of protein complexes in the thylakoid membrane that transfer electrons from water to NADP⁺, building a proton gradient.",
      sources: [],
    },

    // Layer 4 — Key molecules & methods
    {
      id: "n9",
      name: "Rubisco",
      type: "Method",
      layer: 4,
      description:
        "Ribulose-1,5-bisphosphate carboxylase/oxygenase — the most abundant enzyme on Earth, catalyzing the first step of carbon fixation.",
      sources: [
        {
          id: "s9",
          documentName: "Biochemistry, 8th Ed.",
          pageNumber: 622,
          snippet:
            "Rubisco fixes roughly 100 billion tonnes of CO₂ per year globally, yet operates at only 3–10 catalytic cycles per second.",
        },
      ],
    },
    {
      id: "n10",
      name: "NADPH",
      type: "Concept",
      layer: 4,
      description:
        "Reduced nicotinamide adenine dinucleotide phosphate — an electron carrier that shuttles reducing power from the light reactions to the Calvin cycle.",
      sources: [],
    },

    // Layer 5 — Discoverers
    {
      id: "n11",
      name: "Melvin Calvin",
      type: "Person",
      layer: 5,
      description:
        "American biochemist who mapped the complete carbon fixation pathway using radioactive ¹⁴C. Nobel Prize in Chemistry, 1961.",
      sources: [
        {
          id: "s10",
          documentName: "Nobel Prize Archive",
          pageNumber: 1,
          snippet:
            "Calvin's radiotracer experiments between 1950–1954 at Berkeley revealed the full sequence of reactions now bearing his name.",
        },
      ],
    },
    {
      id: "n12",
      name: "Jan Ingenhousz",
      type: "Person",
      layer: 5,
      description:
        "Dutch physiologist who first demonstrated that light is required for plants to produce oxygen (1779), laying the groundwork for photosynthesis research.",
      sources: [],
    },
  ],
  links: [
    { source: "n1", target: "n3", type: "part_of" },
    { source: "n1", target: "n6", type: "part_of" },
    { source: "n1", target: "n7", type: "part_of" },
    { source: "n3", target: "n4", type: "part_of" },
    { source: "n3", target: "n5", type: "part_of" },
    { source: "n4", target: "n6", type: "leads_to" },
    { source: "n4", target: "n8", type: "leads_to" },
    { source: "n6", target: "n2", type: "produces" },
    { source: "n6", target: "n10", type: "produces" },
    { source: "n8", target: "n2", type: "produces" },
    { source: "n5", target: "n7", type: "leads_to" },
    { source: "n2", target: "n7", type: "leads_to" },
    { source: "n10", target: "n7", type: "leads_to" },
    { source: "n7", target: "n9", type: "uses" },
    { source: "n9", target: "n7", type: "part_of" },
    { source: "n7", target: "n10", type: "requires" },
    { source: "n11", target: "n7", type: "discovered_by" },
    { source: "n12", target: "n6", type: "discovered_by" },
    { source: "n1", target: "n2", type: "produces" },
  ],
};

// ─── Visual config ───────────────────────────────────────────────────────────
const NODE_CFG = {
  Concept: {
    color: "#38bdf8",
    glow: "#38bdf888",
    border: "#38bdf855",
    bg: "#38bdf808",
    badge: "#38bdf820",
    label: "#bae6fd",
  },
  Theory: {
    color: "#a78bfa",
    glow: "#a78bfa88",
    border: "#a78bfa55",
    bg: "#a78bfa08",
    badge: "#a78bfa20",
    label: "#ddd6fe",
  },
  Method: {
    color: "#fb923c",
    glow: "#fb923c88",
    border: "#fb923c55",
    bg: "#fb923c08",
    badge: "#fb923c20",
    label: "#fed7aa",
  },
  Person: {
    color: "#34d399",
    glow: "#34d39988",
    border: "#34d39955",
    bg: "#34d39908",
    badge: "#34d39920",
    label: "#a7f3d0",
  },
};

const EDGE_CFG = {
  leads_to: { color: "#38bdf8", label: "Leads to", dash: null },
  produces: { color: "#34d399", label: "Produces", dash: null },
  part_of: { color: "#a78bfa", label: "Part of", dash: null },
  requires: { color: "#f472b6", label: "Requires", dash: "6 3" },
  uses: { color: "#fb923c", label: "Uses", dash: null },
  discovered_by: { color: "#94a3b8", label: "Discovered by", dash: "4 4" },
  connects_to: { color: "#64748b", label: "Connected to", dash: "2 4" },
  prerequisite_of: { color: "#ef4444", label: "Prerequisite of", dash: null },
  contrasts_with: { color: "#f59e0b", label: "Contrasts with", dash: "8 4" },
  example_of: { color: "#22d3ee", label: "Example of", dash: null },
};

const LAYER_META = {
  1: { name: "Core Concepts", accent: "#38bdf8" },
  2: { name: "Structures", accent: "#a78bfa" },
  3: { name: "Processes", accent: "#34d399" },
  4: { name: "Mechanisms", accent: "#fb923c" },
  5: { name: "Contributors", accent: "#fbbf24" },
};

// ─── Layout ──────────────────────────────────────────────────────────────────
const CW = 210; // card width
const CH = 118; // card height (approx)
const LAYER_STEP = 310;
const NODE_STEP = 270;
const START_Y = 80;
const CANVAS_W = 1900;
const CANVAS_H = 1700;

function buildLayout(nodes) {
  const byLayer = {};
  nodes.forEach((n) => {
    (byLayer[n.layer] = byLayer[n.layer] || []).push(n);
  });
  const pos = {};
  Object.keys(byLayer)
    .sort((a, b) => a - b)
    .forEach((lyr, li) => {
      const group = byLayer[lyr];
      const totalW = (group.length - 1) * NODE_STEP;
      const x0 = (CANVAS_W - totalW) / 2 - CW / 2;
      group.forEach((n, ni) => {
        pos[n.id] = { x: x0 + ni * NODE_STEP, y: START_Y + li * LAYER_STEP };
      });
    });
  return pos;
}

function cubicBez(x1, y1, x2, y2) {
  const dy = y2 - y1;
  const dx = x2 - x1;
  const cy = Math.min(Math.abs(dy) * 0.5, 130);
  const cx = Math.abs(dx) > 80 ? dx * 0.12 : 0;
  return `M${x1},${y1} C${x1 + cx},${y1 + cy} ${x2 - cx},${y2 - cy} ${x2},${y2}`;
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function KnowledgeGraph() {
  const [hovered, setHovered] = useState(null);
  const [selected, setSelected] = useState(null);
  const [typeFilter, setTypeFilter] = useState("all");
  const [maxLayer, setMaxLayer] = useState(5);
  const [zoom, setZoom] = useState(0.68);
  const [pan, setPan] = useState({ x: 60, y: 30 });
  const [dragging, setDragging] = useState(false);
  const [dragFrom, setDragFrom] = useState({ x: 0, y: 0 });
  const [tick, setTick] = useState(0); // for particle animation

  // Particle tick
  useEffect(() => {
    const id = setInterval(() => setTick((t) => (t + 1) % 200), 50);
    return () => clearInterval(id);
  }, []);

  // Filtered graph
  const { nodes, links } = useMemo(() => {
    const nodes = GRAPH_DATA.nodes.filter(
      (n) =>
        n.layer <= maxLayer && (typeFilter === "all" || n.type === typeFilter),
    );
    const ids = new Set(nodes.map((n) => n.id));
    return {
      nodes,
      links: GRAPH_DATA.links.filter(
        (l) => ids.has(l.source) && ids.has(l.target),
      ),
    };
  }, [typeFilter, maxLayer]);

  const layout = useMemo(() => buildLayout(nodes), [nodes]);

  // Connected highlight
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

  // Layers present
  const presentLayers = useMemo(
    () => [...new Set(nodes.map((n) => n.layer))].sort((a, b) => a - b),
    [nodes],
  );

  const totalLayerCount = [...new Set(GRAPH_DATA.nodes.map((n) => n.layer))]
    .length;

  // Pan/zoom
  const onWheel = useCallback((e) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    setZoom((z) =>
      Math.min(2, Math.max(0.25, z * (e.deltaY < 0 ? 1.09 : 0.91))),
    );
  }, []);
  const onMD = useCallback(
    (e) => {
      if (e.target.closest("[data-node]")) return;
      setDragging(true);
      setDragFrom({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    },
    [pan],
  );
  const onMM = useCallback(
    (e) => {
      if (!dragging) return;
      setPan({ x: e.clientX - dragFrom.x, y: e.clientY - dragFrom.y });
    },
    [dragging, dragFrom],
  );
  const onMU = useCallback(() => setDragging(false), []);

  const reset = () => {
    setZoom(0.68);
    setPan({ x: 60, y: 30 });
  };

  // Arrowhead SVG point for a bezier end
  function arrowAt(x1, y1, x2, y2) {
    // Direction at end of cubic bezier ≈ last control point → endpoint
    const cy = Math.min(Math.abs(y2 - y1) * 0.5, 130);
    const dx2 = x2 - x1,
      dy2 = y2 - y1;
    const cpx = Math.abs(dx2) > 80 ? x2 - dx2 * 0.12 : x2;
    const cpy = y2 - cy;
    const angle = Math.atan2(y2 - cpy, x2 - cpx);
    return { x: x2, y: y2, angle };
  }

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
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width:4px }
        ::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.1); border-radius:99px }
        ::-webkit-scrollbar-track { background:transparent }
        @keyframes nodeIn { from { opacity:0; transform: scale(0.82) translateY(8px); } to { opacity:1; transform: scale(1) translateY(0); } }
        @keyframes pulseRing { 0%,100% { opacity:0.5; transform:scale(1); } 50% { opacity:0.15; transform:scale(1.06); } }
        @keyframes edgeDraw { from { stroke-dashoffset: 800; } to { stroke-dashoffset: 0; } }
      `}</style>

      {/* ── Dot grid bg ── */}
      <svg
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          opacity: 0.5,
        }}
        aria-hidden
      >
        <defs>
          <pattern
            id="dots"
            x="0"
            y="0"
            width="32"
            height="32"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="1" cy="1" r="0.9" fill="#1e2535" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dots)" />
      </svg>

      {/* ── Topbar ── */}
      <header
        style={{
          position: "relative",
          zIndex: 30,
          flexShrink: 0,
          background: "rgba(7,9,15,0.9)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          padding: "12px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              flexShrink: 0,
              background: "linear-gradient(135deg,#38bdf8 0%,#a78bfa 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 20px #38bdf840",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="2.5" fill="white" />
              <circle cx="2" cy="4" r="1.5" fill="white" opacity=".7" />
              <circle cx="14" cy="3" r="1.5" fill="white" opacity=".7" />
              <circle cx="3" cy="13" r="1.5" fill="white" opacity=".7" />
              <circle cx="13" cy="13" r="1.5" fill="white" opacity=".7" />
              <line
                x1="8"
                y1="8"
                x2="2"
                y2="4"
                stroke="white"
                strokeWidth="1"
                opacity=".4"
              />
              <line
                x1="8"
                y1="8"
                x2="14"
                y2="3"
                stroke="white"
                strokeWidth="1"
                opacity=".4"
              />
              <line
                x1="8"
                y1="8"
                x2="3"
                y2="13"
                stroke="white"
                strokeWidth="1"
                opacity=".4"
              />
              <line
                x1="8"
                y1="8"
                x2="13"
                y2="13"
                stroke="white"
                strokeWidth="1"
                opacity=".4"
              />
            </svg>
          </div>
          <div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "#f1f5f9",
                letterSpacing: "-0.02em",
                lineHeight: 1,
              }}
            >
              Knowledge Graph
            </div>
            <div
              style={{
                fontSize: 11,
                color: "#334155",
                marginTop: 3,
                fontWeight: 500,
              }}
            >
              {nodes.length} nodes · {links.length} edges
            </div>
          </div>
        </div>

        {/* Center controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Type pills */}
          <div
            style={{
              display: "flex",
              gap: 5,
              background: "rgba(255,255,255,0.04)",
              borderRadius: 10,
              padding: "4px 5px",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            {[
              { k: "all", label: "All", color: "#94a3b8" },
              { k: "Concept", label: "Concept", color: NODE_CFG.Concept.color },
              { k: "Theory", label: "Theory", color: NODE_CFG.Theory.color },
              { k: "Method", label: "Method", color: NODE_CFG.Method.color },
              { k: "Person", label: "Person", color: NODE_CFG.Person.color },
            ].map(({ k, label, color }) => {
              const on = typeFilter === k;
              return (
                <button
                  key={k}
                  onClick={() => setTypeFilter(k)}
                  style={{
                    padding: "5px 13px",
                    borderRadius: 7,
                    fontSize: 11,
                    fontWeight: 600,
                    border: on
                      ? `1px solid ${color}50`
                      : "1px solid transparent",
                    background: on ? `${color}18` : "transparent",
                    color: on ? color : "#334155",
                    cursor: "pointer",
                    transition: "all 0.15s",
                    letterSpacing: "0.01em",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Divider */}
          <div
            style={{
              width: 1,
              height: 22,
              background: "rgba(255,255,255,0.07)",
            }}
          />

          {/* Layer depth */}
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span
              style={{
                fontSize: 11,
                color: "#334155",
                fontWeight: 600,
                whiteSpace: "nowrap",
              }}
            >
              Depth
            </span>
            <div style={{ display: "flex", gap: 3 }}>
              {Array.from({ length: totalLayerCount }, (_, i) => i + 1).map(
                (l) => {
                  const meta = LAYER_META[l] || {};
                  const on = l <= maxLayer;
                  return (
                    <button
                      key={l}
                      onClick={() => setMaxLayer(l)}
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 700,
                        border: on
                          ? `1px solid ${meta.accent}50`
                          : "1px solid rgba(255,255,255,0.07)",
                        background: on ? `${meta.accent}15` : "transparent",
                        color: on ? meta.accent : "#1e293b",
                        cursor: "pointer",
                        transition: "all 0.15s",
                        position: "relative",
                      }}
                    >
                      {l}
                    </button>
                  );
                },
              )}
            </div>
          </div>
        </div>

        {/* Zoom controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span
            style={{
              fontSize: 11,
              color: "#1e293b",
              fontWeight: 600,
              marginRight: 2,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {Math.round(zoom * 100)}%
          </span>
          {[
            ["−", () => setZoom((z) => Math.max(0.25, z - 0.1))],
            ["⌾", reset],
            ["+", () => setZoom((z) => Math.min(2, z + 0.1))],
          ].map(([icon, fn]) => (
            <button
              key={icon}
              onClick={fn}
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                fontSize: icon === "⌾" ? 15 : 16,
                fontWeight: icon === "⌾" ? "400" : "300",
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.04)",
                color: "#475569",
                cursor: "pointer",
                transition: "all 0.15s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {icon}
            </button>
          ))}
        </div>
      </header>

      {/* ── Canvas ── */}
      <div
        style={{
          flex: 1,
          position: "relative",
          overflow: "hidden",
          cursor: dragging ? "grabbing" : "grab",
        }}
        onWheel={onWheel}
        onMouseDown={onMD}
        onMouseMove={onMM}
        onMouseUp={onMU}
        onMouseLeave={onMU}
      >
        {/* Radial glow center */}
        <div
          style={{
            position: "absolute",
            top: "40%",
            left: "40%",
            width: 600,
            height: 600,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(56,189,248,0.04) 0%, transparent 70%)",
            pointerEvents: "none",
            transform: "translate(-50%,-50%)",
          }}
        />

        {/* Main canvas */}
        <div
          style={{
            position: "absolute",
            transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom})`,
            transformOrigin: "0 0",
            transition: dragging ? "none" : "transform 0.07s ease-out",
            width: CANVAS_W,
            height: CANVAS_H,
            willChange: "transform",
          }}
        >
          {/* ── SVG: edges + layer rulers ── */}
          <svg
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              overflow: "visible",
              pointerEvents: "none",
            }}
            width={CANVAS_W}
            height={CANVAS_H}
          >
            <defs>
              <filter id="glow4" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="4" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="glow2" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2.5" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              {/* Arrow markers */}
              {Object.entries(EDGE_CFG).flatMap(([type, cfg]) => [
                <marker
                  key={`a-${type}`}
                  id={`a-${type}`}
                  markerWidth="7"
                  markerHeight="7"
                  refX="5.5"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon
                    points="0,0 7,3.5 0,7"
                    fill={cfg.color}
                    opacity="0.8"
                  />
                </marker>,
                <marker
                  key={`ah-${type}`}
                  id={`ah-${type}`}
                  markerWidth="9"
                  markerHeight="9"
                  refX="7"
                  refY="4.5"
                  orient="auto"
                >
                  <polygon points="0,0 9,4.5 0,9" fill={cfg.color} />
                </marker>,
              ])}
            </defs>

            {/* Layer bands */}
            {presentLayers.map((lyr, li) => {
              const meta = LAYER_META[lyr] || {
                name: `Layer ${lyr}`,
                accent: "#475569",
              };
              const bandY = START_Y - 38 + li * LAYER_STEP;
              return (
                <g key={lyr}>
                  <line
                    x1={40}
                    y1={bandY + 20}
                    x2={CANVAS_W - 40}
                    y2={bandY + 20}
                    stroke={meta.accent}
                    strokeWidth={1}
                    opacity={0.1}
                  />
                  <text
                    x={46}
                    y={bandY + 13}
                    fill={meta.accent}
                    fontSize={10}
                    fontWeight="700"
                    opacity={0.55}
                    fontFamily="'Sora',sans-serif"
                    letterSpacing="0.12em"
                    style={{ textTransform: "uppercase" }}
                  >
                    {`LAYER ${lyr} — ${meta.name}`}
                  </text>
                </g>
              );
            })}

            {/* Edges */}
            {links.map((link, i) => {
              const sp = layout[link.source],
                tp = layout[link.target];
              if (!sp || !tp) return null;

              const sx = sp.x + CW / 2;
              const sy = sp.y + CH;
              const tx = tp.x + CW / 2;
              const ty = tp.y;
              const path = cubicBez(sx, sy, tx, ty);

              const cfg = EDGE_CFG[link.type] || EDGE_CFG.connects_to;
              const isHl = hlLinks.has(link);
              const isDimmed = hovered && !isHl;
              const isMain =
                link.type === "leads_to" ||
                link.type === "produces" ||
                link.type === "part_of";

              // Particle progress along the path (0..1) based on tick
              const particleT = ((tick * 2 + i * 17) % 200) / 200;

              return (
                <g key={i}>
                  {/* Glow halo for highlighted */}
                  {isHl && (
                    <path
                      d={path}
                      fill="none"
                      stroke={cfg.color}
                      strokeWidth={8}
                      opacity={0.12}
                      filter="url(#glow4)"
                    />
                  )}
                  {/* Main edge */}
                  <path
                    d={path}
                    fill="none"
                    stroke={cfg.color}
                    strokeWidth={isHl ? 2.2 : isMain ? 1.6 : 1.1}
                    strokeDasharray={cfg.dash || undefined}
                    opacity={
                      isDimmed ? 0.05 : isHl ? 0.95 : isMain ? 0.45 : 0.22
                    }
                    markerEnd={`url(#${isHl ? "ah-" : "a-"}${link.type})`}
                    style={{ transition: "opacity 0.2s, stroke-width 0.2s" }}
                  />
                  {/* Travelling particle on hover */}
                  {isHl && (
                    <circle
                      r={3.5}
                      fill={cfg.color}
                      opacity={0.9}
                      filter="url(#glow2)"
                    >
                      <animateMotion
                        dur="1.8s"
                        repeatCount="indefinite"
                        path={path}
                        keyTimes="0;1"
                        calcMode="linear"
                      />
                    </circle>
                  )}
                </g>
              );
            })}
          </svg>

          {/* ── Node Cards ── */}
          {nodes.map((node, ni) => {
            const pos = layout[node.id];
            if (!pos) return null;
            const cfg = NODE_CFG[node.type] || NODE_CFG.Concept;
            const isHov = hovered === node.id;
            const isHl = hlNodes.has(node.id);
            const isDim = hovered && !isHl;
            const isSel = selected?.id === node.id;

            return (
              <div
                key={node.id}
                data-node="1"
                onMouseEnter={() => setHovered(node.id)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => setSelected(isSel ? null : node)}
                style={{
                  position: "absolute",
                  left: pos.x,
                  top: pos.y,
                  width: CW,
                  minHeight: CH,
                  borderRadius: 14,
                  border: `1px solid ${isSel ? cfg.color : isHov ? cfg.border : "rgba(255,255,255,0.07)"}`,
                  background:
                    isHov || isHl
                      ? `linear-gradient(145deg, ${cfg.bg} 0%, rgba(7,9,15,0.92) 100%)`
                      : "rgba(10,13,22,0.82)",
                  backdropFilter: "blur(10px)",
                  padding: "13px 14px 10px",
                  cursor: "pointer",
                  userSelect: "none",
                  transition: "all 0.22s cubic-bezier(0.34,1.56,0.64,1)",
                  opacity: isDim ? 0.14 : 1,
                  transform: isHov
                    ? "scale(1.05) translateY(-3px)"
                    : isSel
                      ? "scale(1.02)"
                      : "scale(1)",
                  zIndex: isHov || isSel ? 60 : isHl ? 20 : 5,
                  boxShadow: isSel
                    ? `0 0 0 2px ${cfg.color}, 0 0 40px ${cfg.glow}, 0 12px 40px rgba(0,0,0,0.7)`
                    : isHov
                      ? `0 0 28px ${cfg.glow}, 0 10px 28px rgba(0,0,0,0.6)`
                      : isHl
                        ? `0 0 14px ${cfg.glow}60, 0 4px 16px rgba(0,0,0,0.5)`
                        : "0 2px 10px rgba(0,0,0,0.5)",
                  animation: `nodeIn 0.4s ${ni * 0.04}s both ease-out`,
                }}
              >
                {/* Animated ring for selected */}
                {isSel && (
                  <div
                    style={{
                      position: "absolute",
                      inset: -5,
                      borderRadius: 18,
                      border: `1px solid ${cfg.color}`,
                      animation: "pulseRing 2s ease-in-out infinite",
                      pointerEvents: "none",
                    }}
                  />
                )}

                {/* Type chip */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 8,
                  }}
                >
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "2px 8px",
                      borderRadius: 99,
                      background: cfg.badge,
                      border: `1px solid ${cfg.border}`,
                    }}
                  >
                    <div
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: "50%",
                        background: cfg.color,
                        boxShadow: `0 0 6px ${cfg.color}`,
                      }}
                    />
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        color: cfg.label,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                      }}
                    >
                      {node.type}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 600,
                      color: "#1e2a3a",
                      padding: "1px 5px",
                      borderRadius: 4,
                      border: "1px solid rgba(255,255,255,0.04)",
                    }}
                  >
                    L{node.layer}
                  </span>
                </div>

                {/* Name */}
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    letterSpacing: "-0.015em",
                    lineHeight: 1.3,
                    color: isHov || isHl ? cfg.label : "#94a3b8",
                    marginBottom: node.description ? 6 : 0,
                    transition: "color 0.2s",
                  }}
                >
                  {node.name}
                </div>

                {/* Description */}
                {node.description && (
                  <div
                    style={{
                      fontSize: 10.5,
                      color: "#334155",
                      lineHeight: 1.55,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {node.description}
                  </div>
                )}

                {/* Footer */}
                {node.sources.length > 0 && (
                  <div
                    style={{
                      marginTop: 8,
                      paddingTop: 7,
                      borderTop: "1px solid rgba(255,255,255,0.05)",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <rect
                        x="1"
                        y="1"
                        width="8"
                        height="8"
                        rx="1.5"
                        stroke={cfg.color}
                        strokeWidth="1.2"
                        opacity=".7"
                      />
                      <line
                        x1="3"
                        y1="3.5"
                        x2="7"
                        y2="3.5"
                        stroke={cfg.color}
                        strokeWidth="1"
                        opacity=".6"
                      />
                      <line
                        x1="3"
                        y1="5.5"
                        x2="6"
                        y2="5.5"
                        stroke={cfg.color}
                        strokeWidth="1"
                        opacity=".4"
                      />
                    </svg>
                    <span
                      style={{
                        fontSize: 9.5,
                        color: cfg.color,
                        opacity: 0.8,
                        fontWeight: 600,
                      }}
                    >
                      {node.sources.length} source
                      {node.sources.length > 1 ? "s" : ""}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Legend (bottom-left) ── */}
        <div
          style={{
            position: "absolute",
            bottom: 18,
            left: 18,
            zIndex: 30,
            background: "rgba(7,9,15,0.92)",
            backdropFilter: "blur(14px)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 12,
            padding: "12px 16px",
            minWidth: 160,
            maxWidth: 190,
          }}
        >
          <div
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: "#1e2a3a",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            Edge Types
          </div>
          {[
            ["leads_to", "Leads to"],
            ["produces", "Produces"],
            ["part_of", "Part of"],
            ["requires", "Requires"],
            ["uses", "Uses"],
            ["discovered_by", "Discovered by"],
          ].map(([type, label]) => {
            const cfg = EDGE_CFG[type];
            return (
              <div
                key={type}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  marginBottom: 7,
                }}
              >
                <svg width="28" height="8" style={{ flexShrink: 0 }}>
                  <line
                    x1="0"
                    y1="4"
                    x2="21"
                    y2="4"
                    stroke={cfg.color}
                    strokeWidth="1.5"
                    strokeDasharray={cfg.dash || undefined}
                  />
                  <polygon points="21,1.5 28,4 21,6.5" fill={cfg.color} />
                </svg>
                <span style={{ fontSize: 10.5, color: "#475569" }}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>

        {/* ── Keyboard hint ── */}
        <div
          style={{
            position: "absolute",
            bottom: 18,
            right: selected ? 376 : 18,
            zIndex: 30,
            background: "rgba(7,9,15,0.75)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,0.05)",
            borderRadius: 8,
            padding: "6px 12px",
            fontSize: 10.5,
            color: "#1e2a3a",
            fontWeight: 500,
            transition: "right 0.3s cubic-bezier(0.4,0,0.2,1)",
            pointerEvents: "none",
          }}
        >
          Drag to pan · ⌘ Scroll to zoom · Click for details
        </div>

        {/* ── Detail Panel ── */}
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            width: 360,
            zIndex: 40,
            background: "rgba(5,7,14,0.97)",
            backdropFilter: "blur(24px)",
            borderLeft: "1px solid rgba(255,255,255,0.07)",
            display: "flex",
            flexDirection: "column",
            transform: selected ? "translateX(0)" : "translateX(100%)",
            transition: "transform 0.32s cubic-bezier(0.4,0,0.2,1)",
            willChange: "transform",
          }}
        >
          {selected &&
            (() => {
              const cfg = NODE_CFG[selected.type] || NODE_CFG.Concept;
              const meta = LAYER_META[selected.layer] || {
                name: `Layer ${selected.layer}`,
                accent: "#64748b",
              };
              const conns = GRAPH_DATA.links.filter(
                (l) => l.source === selected.id || l.target === selected.id,
              );

              return (
                <>
                  {/* Accent strip */}
                  <div
                    style={{
                      height: 2,
                      flexShrink: 0,
                      background: `linear-gradient(90deg, ${cfg.color} 0%, ${cfg.color}00 70%)`,
                    }}
                  />

                  {/* Panel header */}
                  <div
                    style={{
                      padding: "20px 20px 16px",
                      borderBottom: "1px solid rgba(255,255,255,0.06)",
                      flexShrink: 0,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        marginBottom: 12,
                      }}
                    >
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "3px 10px",
                          borderRadius: 99,
                          background: cfg.badge,
                          border: `1px solid ${cfg.border}`,
                        }}
                      >
                        <div
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            background: cfg.color,
                            boxShadow: `0 0 8px ${cfg.color}`,
                          }}
                        />
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: cfg.label,
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                          }}
                        >
                          {selected.type}
                        </span>
                      </div>
                      <button
                        onClick={() => setSelected(null)}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: "50%",
                          background: "rgba(255,255,255,0.06)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          color: "#475569",
                          cursor: "pointer",
                          fontSize: 16,
                          lineHeight: 1,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "all 0.15s",
                          flexShrink: 0,
                        }}
                      >
                        ×
                      </button>
                    </div>

                    <h2
                      style={{
                        fontSize: 20,
                        fontWeight: 800,
                        color: "#f1f5f9",
                        letterSpacing: "-0.025em",
                        lineHeight: 1.2,
                        marginBottom: 10,
                      }}
                    >
                      {selected.name}
                    </h2>

                    {selected.description && (
                      <p
                        style={{
                          fontSize: 12.5,
                          color: "#64748b",
                          lineHeight: 1.68,
                          marginBottom: 12,
                        }}
                      >
                        {selected.description}
                      </p>
                    )}

                    {/* Layer tag */}
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "4px 10px",
                        borderRadius: 7,
                        background: `${meta.accent}12`,
                        border: `1px solid ${meta.accent}30`,
                        fontSize: 10.5,
                        fontWeight: 600,
                        color: meta.accent,
                      }}
                    >
                      <div
                        style={{
                          width: 5,
                          height: 5,
                          borderRadius: "50%",
                          background: meta.accent,
                        }}
                      />
                      Layer {selected.layer} · {meta.name}
                    </div>
                  </div>

                  {/* Connections */}
                  <div
                    style={{
                      padding: "14px 20px",
                      borderBottom: "1px solid rgba(255,255,255,0.05)",
                      flexShrink: 0,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 9.5,
                        fontWeight: 700,
                        color: "#1e2a3a",
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        marginBottom: 10,
                      }}
                    >
                      Connections ({conns.length})
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 5,
                        maxHeight: 160,
                        overflowY: "auto",
                      }}
                    >
                      {conns.map((l, i) => {
                        const otherId =
                          l.source === selected.id ? l.target : l.source;
                        const other = GRAPH_DATA.nodes.find(
                          (n) => n.id === otherId,
                        );
                        if (!other) return null;
                        const ec = EDGE_CFG[l.type] || EDGE_CFG.connects_to;
                        const nc = NODE_CFG[other.type] || NODE_CFG.Concept;
                        const isOut = l.source === selected.id;
                        return (
                          <div
                            key={i}
                            onClick={() => setSelected(other)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 9,
                              padding: "7px 10px",
                              borderRadius: 9,
                              background: "rgba(255,255,255,0.025)",
                              border: "1px solid rgba(255,255,255,0.05)",
                              cursor: "pointer",
                              transition: "background 0.15s",
                            }}
                          >
                            <div
                              style={{
                                width: 7,
                                height: 7,
                                borderRadius: "50%",
                                flexShrink: 0,
                                background: ec.color,
                                boxShadow: `0 0 6px ${ec.color}`,
                              }}
                            />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div
                                style={{
                                  fontSize: 12,
                                  fontWeight: 600,
                                  color: "#94a3b8",
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                              >
                                {other.name}
                              </div>
                              <div
                                style={{
                                  fontSize: 9.5,
                                  color: "#334155",
                                  marginTop: 1,
                                }}
                              >
                                {isOut ? "→" : "←"} {l.type.replace(/_/g, " ")}
                              </div>
                            </div>
                            <div
                              style={{
                                fontSize: 9,
                                fontWeight: 600,
                                color: nc.label,
                                padding: "2px 6px",
                                borderRadius: 5,
                                background: nc.badge,
                                border: `1px solid ${nc.border}`,
                                whiteSpace: "nowrap",
                                flexShrink: 0,
                              }}
                            >
                              {other.type}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Sources */}
                  <div
                    style={{ flex: 1, overflowY: "auto", padding: "14px 20px" }}
                  >
                    <div
                      style={{
                        fontSize: 9.5,
                        fontWeight: 700,
                        color: "#1e2a3a",
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        marginBottom: 12,
                      }}
                    >
                      Sources ({selected.sources.length})
                    </div>
                    {selected.sources.length === 0 && (
                      <div
                        style={{
                          fontSize: 12,
                          color: "#1e2a3a",
                          fontStyle: "italic",
                          padding: "8px 0",
                        }}
                      >
                        No sources attached to this node.
                      </div>
                    )}
                    {selected.sources.map((src, i) => (
                      <div
                        key={i}
                        style={{
                          marginBottom: 12,
                          borderRadius: 10,
                          background: "rgba(255,255,255,0.025)",
                          border: "1px solid rgba(255,255,255,0.06)",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            padding: "10px 12px 8px",
                            borderBottom: "1px solid rgba(255,255,255,0.04)",
                            display: "flex",
                            alignItems: "center",
                            gap: 9,
                          }}
                        >
                          <div
                            style={{
                              width: 30,
                              height: 30,
                              borderRadius: 7,
                              flexShrink: 0,
                              background: `${cfg.color}15`,
                              border: `1px solid ${cfg.border}`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 13,
                            }}
                          >
                            📄
                          </div>
                          <div>
                            <div
                              style={{
                                fontSize: 12,
                                fontWeight: 600,
                                color: "#64748b",
                                lineHeight: 1.3,
                              }}
                            >
                              {src.documentName}
                            </div>
                            <div
                              style={{
                                fontSize: 10,
                                color: "#334155",
                                marginTop: 2,
                              }}
                            >
                              Page {src.pageNumber}
                            </div>
                          </div>
                        </div>
                        <div
                          style={{
                            padding: "10px 12px",
                            fontSize: 11.5,
                            color: "#475569",
                            lineHeight: 1.65,
                            fontStyle: "italic",
                            borderLeft: `3px solid ${cfg.border}`,
                          }}
                        >
                          "{src.snippet}"
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              );
            })()}
        </div>
      </div>
    </div>
  );
}
