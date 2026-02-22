import { EDGE_CFG, LAYER_META } from "./config";
import {
  CANVAS_H,
  CANVAS_W,
  CH,
  CW,
  LAYER_STEP,
  START_Y,
  cubicBez,
} from "./layout";

function GraphDefs() {
  return (
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
          <polygon points="0,0 7,3.5 0,7" fill={cfg.color} opacity="0.8" />
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
  );
}

function LayerBands({ presentLayers }) {
  return (
    <>
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
    </>
  );
}

function Edges({ links, layout, hovered, hlLinks, tick }) {
  return (
    <>
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

        // kept (even though not directly used) to preserve parity w/ original intent
        const _particleT = ((tick * 2 + i * 17) % 200) / 200;

        return (
          <g key={i}>
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

            <path
              d={path}
              fill="none"
              stroke={cfg.color}
              strokeWidth={isHl ? 2.2 : isMain ? 1.6 : 1.1}
              strokeDasharray={cfg.dash || undefined}
              opacity={isDimmed ? 0.05 : isHl ? 0.95 : isMain ? 0.45 : 0.22}
              markerEnd={`url(#${isHl ? "ah-" : "a-"}${link.type})`}
              style={{ transition: "opacity 0.2s, stroke-width 0.2s" }}
            />

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
    </>
  );
}

export default function GraphSvg({
  presentLayers,
  links,
  layout,
  hovered,
  hlLinks,
  tick,
}) {
  return (
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
      <GraphDefs />
      <LayerBands presentLayers={presentLayers} />
      <Edges
        links={links}
        layout={layout}
        hovered={hovered}
        hlLinks={hlLinks}
        tick={tick}
      />
    </svg>
  );
}
