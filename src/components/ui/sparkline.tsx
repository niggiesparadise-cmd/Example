import { cn } from "@heroui/react";

interface SparklineProps {
  /** Twelve or so values; the last one is the current period. */
  values: number[];
  /** Accessible summary — the trend is decorative without it. */
  label: string;
  className?: string;
}

const WIDTH = 72;
const HEIGHT = 32;
const PADDING = 3;

/**
 * A compact trend line for stat tiles.
 *
 * The line is drawn in the de-emphasis hue with the final point in the accent,
 * so the eye lands on "now" rather than on the whole series. Rendered as plain
 * SVG with Tailwind colour classes, so it themes without any JavaScript.
 */
export function Sparkline({ className, label, values }: SparklineProps) {
  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = (WIDTH - PADDING * 2) / (values.length - 1);

  const points = values.map((value, index) => {
    const x = PADDING + index * step;
    const y = HEIGHT - PADDING - ((value - min) / span) * (HEIGHT - PADDING * 2);
    return [x, y] as const;
  });

  const [lastX, lastY] = points[points.length - 1];

  return (
    <svg
      aria-label={label}
      className={cn("h-7 w-[72px] shrink-0 overflow-visible", className)}
      role="img"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
    >
      <polyline
        className="fill-none stroke-muted opacity-70"
        points={points.map(([x, y]) => `${x},${y}`).join(" ")}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
      />
      {/* The 2px surface ring keeps the end dot legible where it meets the line. */}
      <circle className="fill-surface" cx={lastX} cy={lastY} r={4.5} />
      <circle className="fill-accent" cx={lastX} cy={lastY} r={3} />
    </svg>
  );
}
