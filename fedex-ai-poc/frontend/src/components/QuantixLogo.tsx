"use client";

interface Props {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: { viewH: 28, hex: 0.7, textSize: 15, x: 34, aiX: 103 },
  md: { viewH: 44, hex: 1.0, textSize: 22, x: 48, aiX: 148 },
  lg: { viewH: 60, hex: 1.4, textSize: 30, x: 66, aiX: 202 },
};

export default function QuantixLogo({ className = "", size = "md" }: Props) {
  const s = sizes[size];
  const w = s.aiX + 30;

  return (
    <svg
      viewBox={`0 0 ${w} ${s.viewH}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="QuantixAI"
      role="img"
    >
      {/* Hexagon mark */}
      <g transform={`scale(${s.hex}) translate(0, ${(s.viewH / s.hex - 40) / 2})`}>
        <polygon points="22,2 38,11 38,29 22,38 6,29 6,11" fill="#0f172a" className="dark:fill-white" />
        <rect x="13" y="22" width="4" height="10" rx="1" fill="#6366f1" />
        <rect x="19" y="17" width="4" height="15" rx="1" fill="#818cf8" />
        <rect x="25" y="13" width="4" height="19" rx="1" fill="#6366f1" />
        <circle cx="31" cy="13" r="2.5" fill="#a5b4fc" />
      </g>

      {/* Quantix */}
      <text
        x={s.x}
        y={s.viewH * 0.68}
        fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif"
        fontSize={s.textSize}
        fontWeight="800"
        letterSpacing="-0.5"
        fill="currentColor"
      >
        Quantix
      </text>

      {/* AI — accent indigo */}
      <text
        x={s.aiX}
        y={s.viewH * 0.68}
        fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif"
        fontSize={s.textSize}
        fontWeight="800"
        letterSpacing="-0.5"
        fill="#6366f1"
      >
        AI
      </text>
    </svg>
  );
}
