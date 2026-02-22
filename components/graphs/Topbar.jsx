import { NODE_CFG, LAYER_META } from "./config";

function Brand({ nodesCount, linksCount }) {
  return (
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
          {nodesCount} nodes · {linksCount} edges
        </div>
      </div>
    </div>
  );
}

function TypeFilterPills({ typeFilter, setTypeFilter }) {
  return (
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
              border: on ? `1px solid ${color}50` : "1px solid transparent",
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
  );
}

function DepthSelector({ maxLayer, setMaxLayer, totalLayerCount }) {
  return (
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
        {Array.from({ length: totalLayerCount }, (_, i) => i + 1).map((l) => {
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
        })}
      </div>
    </div>
  );
}

function ZoomControls({ zoom, setZoom, reset }) {
  return (
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
  );
}

export default function Topbar({
  nodesCount,
  linksCount,
  typeFilter,
  setTypeFilter,
  maxLayer,
  setMaxLayer,
  totalLayerCount,
  zoom,
  setZoom,
  reset,
}) {
  return (
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
      <Brand nodesCount={nodesCount} linksCount={linksCount} />

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <TypeFilterPills
          typeFilter={typeFilter}
          setTypeFilter={setTypeFilter}
        />
        <div
          style={{ width: 1, height: 22, background: "rgba(255,255,255,0.07)" }}
        />
        <DepthSelector
          maxLayer={maxLayer}
          setMaxLayer={setMaxLayer}
          totalLayerCount={totalLayerCount}
        />
      </div>

      <ZoomControls zoom={zoom} setZoom={setZoom} reset={reset} />
    </header>
  );
}
