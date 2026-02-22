import { NODE_CFG } from "./config";
import { CH, CW } from "./layout";

function NodeCard({ node, index, pos, hovered, setHovered, selected, setSelected, hlNodes }) {
  const cfg = NODE_CFG[node.type] || NODE_CFG.Concept;
  const isHov = hovered === node.id;
  const isHl = hlNodes.has(node.id);
  const isDim = hovered && !isHl;
  const isSel = selected?.id === node.id;

  return (
    <div
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
        border: `1px solid ${
          isSel ? cfg.color : isHov ? cfg.border : "rgba(255,255,255,0.07)"
        }`,
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
        transform: isHov ? "scale(1.05) translateY(-3px)" : isSel ? "scale(1.02)" : "scale(1)",
        zIndex: isHov || isSel ? 60 : isHl ? 20 : 5,
        boxShadow: isSel
          ? `0 0 0 2px ${cfg.color}, 0 0 40px ${cfg.glow}, 0 12px 40px rgba(0,0,0,0.7)`
          : isHov
            ? `0 0 28px ${cfg.glow}, 0 10px 28px rgba(0,0,0,0.6)`
            : isHl
              ? `0 0 14px ${cfg.glow}60, 0 4px 16px rgba(0,0,0,0.5)`
              : "0 2px 10px rgba(0,0,0,0.5)",
        animation: `nodeIn 0.4s ${index * 0.04}s both ease-out`,
      }}
    >
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
            <rect x="1" y="1" width="8" height="8" rx="1.5" stroke={cfg.color} strokeWidth="1.2" opacity=".7" />
            <line x1="3" y1="3.5" x2="7" y2="3.5" stroke={cfg.color} strokeWidth="1" opacity=".6" />
            <line x1="3" y1="5.5" x2="6" y2="5.5" stroke={cfg.color} strokeWidth="1" opacity=".4" />
          </svg>
          <span style={{ fontSize: 9.5, color: cfg.color, opacity: 0.8, fontWeight: 600 }}>
            {node.sources.length} source{node.sources.length > 1 ? "s" : ""}
          </span>
        </div>
      )}
    </div>
  );
}

export default function NodeCards({
  nodes,
  layout,
  hovered,
  setHovered,
  selected,
  setSelected,
  hlNodes,
}) {
  return (
    <>
      {nodes.map((node, ni) => {
        const pos = layout[node.id];
        if (!pos) return null;
        return (
          <NodeCard
            key={node.id}
            node={node}
            index={ni}
            pos={pos}
            hovered={hovered}
            setHovered={setHovered}
            selected={selected}
            setSelected={setSelected}
            hlNodes={hlNodes}
          />
        );
      })}
    </>
  );
}