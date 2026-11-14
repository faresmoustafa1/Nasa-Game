// Mission ARES — the four crew members. Same four people in every scene.

export const CREW = [
  { id: "commander", name: "Commander", accent: "#e0663a", skin: "#e2b48f", hair: "#4a2a1a" },
  { id: "doctor", name: "Doctor", accent: "#3fb6a8", skin: "#8a5a3c", hair: "#1c120c" },
  { id: "engineer", name: "Engineer", accent: "#7f77dd", skin: "#f0c8a0", hair: "#c2802c" },
  { id: "pilot", name: "Pilot", accent: "#4a8be0", skin: "#a9703f", hair: "#14100c" },
] as const;

export type CrewId = (typeof CREW)[number]["id"];

