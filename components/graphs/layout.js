export const CW = 210;
export const CH = 118;
export const LAYER_STEP = 310;
export const NODE_STEP = 270;
export const START_Y = 80;
export const CANVAS_W = 1900;
export const CANVAS_H = 1700;

export function buildLayout(nodes) {
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

export function cubicBez(x1, y1, x2, y2) {
  const dy = y2 - y1;
  const dx = x2 - x1;
  const cy = Math.min(Math.abs(dy) * 0.5, 130);
  const cx = Math.abs(dx) > 80 ? dx * 0.12 : 0;
  return `M${x1},${y1} C${x1 + cx},${y1 + cy} ${x2 - cx},${y2 - cy} ${x2},${y2}`;
}