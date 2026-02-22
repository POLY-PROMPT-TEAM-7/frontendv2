import { EDGE_CFG } from "./config";

export default function Legend() {
  return (
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
            style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 7 }}
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
            <span style={{ fontSize: 10.5, color: "#475569" }}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}