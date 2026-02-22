export default function KeyboardHint({ selected }) {
  return (
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
  );
}