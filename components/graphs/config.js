export const NODE_CFG = {
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

export const EDGE_CFG = {
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

export const LAYER_META = {
  1: { name: "Core Concepts", accent: "#38bdf8" },
  2: { name: "Structures", accent: "#a78bfa" },
  3: { name: "Processes", accent: "#34d399" },
  4: { name: "Mechanisms", accent: "#fb923c" },
  5: { name: "Contributors", accent: "#fbbf24" },
};