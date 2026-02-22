export const GRAPH_DATA = {
  nodes: [
    {
      id: "n1",
      name: "Photosynthesis",
      type: "Concept",
      layer: 1,
      description:
        "The process by which plants and algae convert light energy into chemical energy, producing glucose and oxygen.",
      sources: [
        {
          id: "s1",
          documentName: "Campbell Biology, 11th Ed.",
          pageNumber: 186,
          snippet:
            "Photosynthesis is the process that converts solar energy into chemical energy, storing it in the bonds of sugar.",
        },
        {
          id: "s2",
          documentName: "Lecture Notes — Week 4",
          pageNumber: 3,
          snippet:
            "Overall equation: 6CO₂ + 6H₂O + light energy → C₆H₁₂O₆ + 6O₂",
        },
      ],
    },
    {
      id: "n2",
      name: "ATP",
      type: "Concept",
      layer: 1,
      description:
        "Adenosine triphosphate — the universal energy currency of the cell, powering virtually every cellular process.",
      sources: [
        {
          id: "s3",
          documentName: "Campbell Biology, 11th Ed.",
          pageNumber: 144,
          snippet:
            "ATP is the energy currency that drives cellular work when its terminal phosphate group is transferred to other molecules.",
        },
      ],
    },

    {
      id: "n3",
      name: "Chloroplast",
      type: "Concept",
      layer: 2,
      description:
        "The organelle in plant cells where photosynthesis occurs, containing stacked thylakoid membranes surrounded by stroma.",
      sources: [
        {
          id: "s4",
          documentName: "Cell Biology Review",
          pageNumber: 88,
          snippet:
            "Chloroplasts contain an elaborate system of membranes that increases the surface area for light reactions.",
        },
      ],
    },
    {
      id: "n4",
      name: "Thylakoid Membrane",
      type: "Concept",
      layer: 2,
      description:
        "The internal membrane system of the chloroplast where the light-dependent reactions occur.",
      sources: [],
    },
    {
      id: "n5",
      name: "Stroma",
      type: "Concept",
      layer: 2,
      description:
        "The fluid-filled space surrounding the thylakoids where the Calvin cycle takes place.",
      sources: [
        {
          id: "s5",
          documentName: "Campbell Biology, 11th Ed.",
          pageNumber: 190,
          snippet:
            "The stroma is the site of carbon fixation reactions, containing the enzymes needed for the Calvin cycle.",
        },
      ],
    },

    {
      id: "n6",
      name: "Light Reactions",
      type: "Concept",
      layer: 3,
      description:
        "The first stage of photosynthesis that captures solar energy to produce ATP and NADPH while splitting water.",
      sources: [
        {
          id: "s6",
          documentName: "Lecture Notes — Week 5",
          pageNumber: 7,
          snippet:
            "Light reactions occur in the thylakoid membrane and require direct light input to drive electron flow.",
        },
      ],
    },
    {
      id: "n7",
      name: "Calvin Cycle",
      type: "Concept",
      layer: 3,
      description:
        "The light-independent reactions in the stroma that use ATP and NADPH to fix CO₂ into glyceraldehyde-3-phosphate.",
      sources: [
        {
          id: "s7",
          documentName: "Biochemistry, 8th Ed.",
          pageNumber: 616,
          snippet:
            "Each complete turn of the Calvin cycle fixes one CO₂ molecule, requiring 3 ATP and 2 NADPH.",
        },
        {
          id: "s8",
          documentName: "Lecture Notes — Week 5",
          pageNumber: 11,
          snippet:
            "The Calvin cycle is not truly 'dark' — several enzymes are light-activated.",
        },
      ],
    },
    {
      id: "n8",
      name: "Electron Transport Chain",
      type: "Method",
      layer: 3,
      description:
        "A series of protein complexes in the thylakoid membrane that transfer electrons from water to NADP⁺, building a proton gradient.",
      sources: [],
    },

    {
      id: "n9",
      name: "Rubisco",
      type: "Method",
      layer: 4,
      description:
        "Ribulose-1,5-bisphosphate carboxylase/oxygenase — the most abundant enzyme on Earth, catalyzing the first step of carbon fixation.",
      sources: [
        {
          id: "s9",
          documentName: "Biochemistry, 8th Ed.",
          pageNumber: 622,
          snippet:
            "Rubisco fixes roughly 100 billion tonnes of CO₂ per year globally, yet operates at only 3–10 catalytic cycles per second.",
        },
      ],
    },
    {
      id: "n10",
      name: "NADPH",
      type: "Concept",
      layer: 4,
      description:
        "Reduced nicotinamide adenine dinucleotide phosphate — an electron carrier that shuttles reducing power from the light reactions to the Calvin cycle.",
      sources: [],
    },

    {
      id: "n11",
      name: "Melvin Calvin",
      type: "Person",
      layer: 5,
      description:
        "American biochemist who mapped the complete carbon fixation pathway using radioactive ¹⁴C. Nobel Prize in Chemistry, 1961.",
      sources: [
        {
          id: "s10",
          documentName: "Nobel Prize Archive",
          pageNumber: 1,
          snippet:
            "Calvin's radiotracer experiments between 1950–1954 at Berkeley revealed the full sequence of reactions now bearing his name.",
        },
      ],
    },
    {
      id: "n12",
      name: "Jan Ingenhousz",
      type: "Person",
      layer: 5,
      description:
        "Dutch physiologist who first demonstrated that light is required for plants to produce oxygen (1779), laying the groundwork for photosynthesis research.",
      sources: [],
    },
  ],
  links: [
    { source: "n1", target: "n3", type: "part_of" },
    { source: "n1", target: "n6", type: "part_of" },
    { source: "n1", target: "n7", type: "part_of" },
    { source: "n3", target: "n4", type: "part_of" },
    { source: "n3", target: "n5", type: "part_of" },
    { source: "n4", target: "n6", type: "leads_to" },
    { source: "n4", target: "n8", type: "leads_to" },
    { source: "n6", target: "n2", type: "produces" },
    { source: "n6", target: "n10", type: "produces" },
    { source: "n8", target: "n2", type: "produces" },
    { source: "n5", target: "n7", type: "leads_to" },
    { source: "n2", target: "n7", type: "leads_to" },
    { source: "n10", target: "n7", type: "leads_to" },
    { source: "n7", target: "n9", type: "uses" },
    { source: "n9", target: "n7", type: "part_of" },
    { source: "n7", target: "n10", type: "requires" },
    { source: "n11", target: "n7", type: "discovered_by" },
    { source: "n12", target: "n6", type: "discovered_by" },
    { source: "n1", target: "n2", type: "produces" },
  ],
};
