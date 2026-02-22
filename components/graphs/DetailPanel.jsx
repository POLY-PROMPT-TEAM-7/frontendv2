import { GRAPH_DATA } from "./temporaryData";
import { EDGE_CFG, LAYER_META, NODE_CFG } from "./config";

function ConnectionsList({ selected, setSelected }) {
  const conns = GRAPH_DATA.links.filter(
    (l) => l.source === selected.id || l.target === selected.id,
  );

  return (
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
          const otherId = l.source === selected.id ? l.target : l.source;
          const other = GRAPH_DATA.nodes.find((n) => n.id === otherId);
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
                <div style={{ fontSize: 9.5, color: "#334155", marginTop: 1 }}>
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
  );
}

function SourcesList({ selected }) {
  const cfg = NODE_CFG[selected.type] || NODE_CFG.Concept;

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "14px 20px" }}>
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
              <div style={{ fontSize: 10, color: "#334155", marginTop: 2 }}>
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
            {src.snippet}
          </div>
        </div>
      ))}
    </div>
  );
}

function DetailPanelInner({ selected, setSelected }) {
  const cfg = NODE_CFG[selected.type] || NODE_CFG.Concept;
  const meta = LAYER_META[selected.layer] || {
    name: `Layer ${selected.layer}`,
    accent: "#64748b",
  };

  return (
    <>
      <div
        style={{
          height: 2,
          flexShrink: 0,
          background: `linear-gradient(90deg, ${cfg.color} 0%, ${cfg.color}00 70%)`,
        }}
      />

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

      <ConnectionsList selected={selected} setSelected={setSelected} />
      <SourcesList selected={selected} />
    </>
  );
}

export default function DetailPanel({ selected, setSelected }) {
  return (
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
      {selected && (
        <DetailPanelInner selected={selected} setSelected={setSelected} />
      )}
    </div>
  );
}
