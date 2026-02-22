export default function DotGridBackground() {
  return (
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
  );
}