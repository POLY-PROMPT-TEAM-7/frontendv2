import { useCallback } from "react";
import Legend from "./Legend";
import KeyboardHint from "./KeyboardHint";
import { CANVAS_H, CANVAS_W } from "./layout";

export default function GraphCanvas({
  dragging,
  setDragging,
  dragFrom,
  setDragFrom,
  pan,
  setPan,
  zoom,
  onWheel,
  selected,
  children,
}) {
  const handleWheel = useCallback(
    (e) => {
      if (!onWheel) return onWheel?.(e);
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();

      // match the zoom scale logic used by the parent `onWheel`
      const scale = e.deltaY < 0 ? 1.09 : 0.91;

      const rect = e.currentTarget.getBoundingClientRect();
      const center = { x: rect.width / 2, y: rect.height / 2 };

      // pan' = pan + (1 - scale) * (center - pan)
      const newPan = {
        x: pan.x + (1 - scale) * (center.x - pan.x),
        y: pan.y + (1 - scale) * (center.y - pan.y),
      };

      setPan(newPan);
      onWheel(e);
    },
    [onWheel, pan, setPan],
  );
  const onMD = useCallback(
    (e) => {
      if (e.target.closest("[data-node]")) return;
      setDragging(true);
      setDragFrom({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    },
    [pan, setDragging, setDragFrom],
  );

  const onMM = useCallback(
    (e) => {
      if (!dragging) return;
      setPan({ x: e.clientX - dragFrom.x, y: e.clientY - dragFrom.y });
    },
    [dragging, dragFrom, setPan],
  );

  const onMU = useCallback(() => setDragging(false), [setDragging]);

  return (
    <div
      style={{
        flex: 1,
        position: "relative",
        overflow: "hidden",
        cursor: dragging ? "grabbing" : "grab",
      }}
      onWheel={handleWheel}
      onMouseDown={onMD}
      onMouseMove={onMM}
      onMouseUp={onMU}
      onMouseLeave={onMU}
    >
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
        {children}
      </div>

      <Legend />
      <KeyboardHint selected={selected} />
    </div>
  );
}
