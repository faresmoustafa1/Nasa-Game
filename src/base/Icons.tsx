// Icons as inline SVG. Every stat has its own SHAPE (not just a color), so
// players who see colors differently can still tell them apart.
//   power = lightning bolt · air = O₂ bubbles · food = leaf · time = hourglass
//   shield = shield · dust = cloud · science = star

export type IconName =
  | "power"
  | "air"
  | "food"
  | "time"
  | "shield"
  | "dust"
  | "science"
  | "walk"
  | "base"
  | "flare"
  | "plants"
  | "message"
  | "storm"
  | "check";

const ICON_COLOR: Record<IconName, string> = {
  power: "#ffd23f",
  air: "#4cc3ff",
  food: "#5fd068",
  time: "#e6dcff",
  shield: "#c39bff",
  dust: "#d49a6a",
  science: "#ff9ecf",
  walk: "#f4f1e8",
  base: "#f4f1e8",
  flare: "#ff9b3d",
  plants: "#5fd068",
  message: "#9fe3ff",
  storm: "#d49a6a",
  check: "#5fd068",
};

const DARK = "#141a2b";

function Shape({ name }: { name: IconName }) {
  const c = ICON_COLOR[name];
  switch (name) {
    case "power":
      return <path d="M13.5 1.5 3.5 13.5h7l-1.5 9 11-13h-7z" fill={c} stroke={DARK} strokeWidth="1.4" strokeLinejoin="round" />;
    case "air":
      return (
        <g stroke={DARK} strokeWidth="1.2">
          <circle cx="10" cy="13" r="8.5" fill={c} />
          <circle cx="19.5" cy="6" r="3.5" fill={c} />
          <circle cx="20" cy="16.5" r="2.3" fill={c} />
          <text x="10" y="16.6" textAnchor="middle" fontSize="9.5" fontWeight="900" fill={DARK} stroke="none" fontFamily="system-ui, sans-serif">O₂</text>
        </g>
      );
    case "food":
    case "plants":
      return (
        <g stroke={DARK} strokeWidth="1.3" strokeLinejoin="round">
          <path d="M4 20C3 10 10 3 21 3c0 11-7 18-17 17z" fill={c} />
          <path d="M4 20 15 9" fill="none" strokeLinecap="round" />
        </g>
      );
    case "time":
      return (
        <g stroke={DARK} strokeWidth="1.3" strokeLinejoin="round">
          <path d="M5 2h14v2c0 4-4 6-5 8 1 2 5 4 5 8v2H5v-2c0-4 4-6 5-8-1-2-5-4-5-8z" fill={c} />
          <path d="M8.5 19.5c0-2.5 3.5-3.5 3.5-5 0 1.5 3.5 2.5 3.5 5z" fill={DARK} stroke="none" />
        </g>
      );
    case "shield":
      return (
        <g stroke={DARK} strokeWidth="1.3" strokeLinejoin="round">
          <path d="M12 1.5 3 5v6c0 6 4 10 9 11.5 5-1.5 9-5.5 9-11.5V5z" fill={c} />
          <path d="M12 5v14" fill="none" strokeWidth="1.2" opacity="0.5" />
        </g>
      );
    case "dust":
    case "storm":
      return (
        <g stroke={DARK} strokeWidth="1.3">
          <path d="M6 18a4.5 4.5 0 0 1 0-9 6 6 0 0 1 11.5-1.5A5 5 0 0 1 18 18z" fill={c} />
          {name === "storm" && <path d="M5 21h10M9 23h9" stroke={c} strokeWidth="1.8" strokeLinecap="round" />}
        </g>
      );
    case "science":
      return <path d="m12 1.8 3 6.4 7 .9-5.1 4.8 1.3 6.9L12 17.5l-6.2 3.3 1.3-6.9L2 9.1l7-.9z" fill={c} stroke={DARK} strokeWidth="1.3" strokeLinejoin="round" />;
    case "walk":
      return (
        <g fill={c} stroke={DARK} strokeWidth="1">
          <ellipse cx="8" cy="8" rx="3.2" ry="5" transform="rotate(-12 8 8)" />
          <ellipse cx="16" cy="15" rx="3.2" ry="5" transform="rotate(12 16 15)" />
        </g>
      );
    case "base":
      return (
        <g stroke={DARK} strokeWidth="1.3" strokeLinejoin="round">
          <path d="M2 20v-6a10 8 0 0 1 20 0v6z" fill={c} />
          <rect x="9.5" y="14" width="5" height="6" fill={DARK} />
        </g>
      );
    case "flare":
      return (
        <g stroke={DARK} strokeWidth="1.2">
          <circle cx="12" cy="12" r="5.5" fill={c} />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
            <path key={a} d="M12 1.5v4" stroke={c} strokeWidth="2.4" strokeLinecap="round" transform={`rotate(${a} 12 12)`} />
          ))}
        </g>
      );
    case "message":
      return (
        <g stroke={DARK} strokeWidth="1.3" strokeLinejoin="round">
          <rect x="2" y="5" width="20" height="14" rx="2" fill={c} />
          <path d="m2.5 6 9.5 7 9.5-7" fill="none" />
        </g>
      );
    case "check":
      return <path d="m4 12.5 5 5L20 6" fill="none" stroke={c} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />;
  }
}

export function Icon({ name, size = 24, title }: { name: IconName; size?: number; title?: string }) {
  return (
    <svg
      className={`icon icon--${name}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <Shape name={name} />
    </svg>
  );
}

/** Same icons inside the big SVG scene (no nested <svg> sizing quirks). */
export function SceneIcon({ name, x, y, size }: { name: IconName; x: number; y: number; size: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${size / 24})`} aria-hidden="true">
      <Shape name={name} />
    </g>
  );
}
