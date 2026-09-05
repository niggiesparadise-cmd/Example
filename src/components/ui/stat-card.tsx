import { Card, ProgressBar, cn } from "@heroui/react";
import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import { Sparkline } from "./sparkline";

export interface StatDelta {
  /** Already-formatted magnitude, e.g. `"+12%"`. */
  label: string;
  direction: "up" | "down" | "flat";
  /** Whether moving up is the good direction for this metric. */
  upIsGood: boolean;
  /** What the change is measured against, e.g. `"vs last week"`. */
  period: string;
}

interface StatCardProps {
  label: string;
  /** The headline figure, already formatted. */
  value: string;
  /** Unit or qualifier shown next to the value, e.g. `"hours"`. */
  unit?: string;
  icon: ReactNode;
  delta?: StatDelta;
  /** A line of context under the value. */
  caption?: string;
  /** Twelve-point trend, drawn as a sparkline. */
  trend?: number[];
  /** A ratio meter rendered under the value, e.g. tasks completed. */
  meter?: { value: number; label: string };
}

const arrows = { up: ArrowUpRight, down: ArrowDownRight, flat: ArrowRight };

/**
 * A single headline number.
 *
 * Label, value, delta and trend — the four parts of a stat tile. The delta's
 * colour is doubled by its arrow, so direction never depends on hue alone.
 */
export function StatCard({ caption, delta, icon, label, meter, trend, unit, value }: StatCardProps) {
  const Arrow = delta ? arrows[delta.direction] : null;
  const isGood = delta
    ? delta.direction === "flat"
      ? null
      : (delta.direction === "up") === delta.upIsGood
    : null;

  return (
    <Card className="gap-3 border border-border p-5">
      <Card.Header className="flex-row items-center justify-between gap-2">
        <Card.Title className="text-sm font-medium text-muted">{label}</Card.Title>
        <span aria-hidden="true" className="text-muted">
          {icon}
        </span>
      </Card.Header>

      <Card.Content className="gap-2">
        <div className="flex items-end justify-between gap-3">
          <p className="flex shrink-0 items-baseline gap-1.5 whitespace-nowrap">
            <span className="text-2xl leading-none font-semibold text-foreground">{value}</span>
            {unit ? <span className="text-sm text-muted">{unit}</span> : null}
          </p>
          {trend ? (
            <Sparkline
              className="min-w-0"
              label={`${label} trend over the last ${trend.length} days`}
              values={trend}
            />
          ) : null}
        </div>

        {delta ? (
          <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs">
            <span
              className={cn(
                "inline-flex items-center gap-0.5 font-medium",
                isGood === null && "text-muted",
                isGood === true && "text-delta-good",
                isGood === false && "text-delta-bad",
              )}
            >
              {Arrow ? <Arrow aria-hidden="true" className="size-3.5" strokeWidth={2.25} /> : null}
              {delta.label}
            </span>
            <span className="text-muted">{delta.period}</span>
          </p>
        ) : null}

        {caption ? <p className="text-xs text-muted">{caption}</p> : null}

        {meter ? (
          <ProgressBar aria-label={meter.label} className="mt-1" size="sm" value={meter.value}>
            <ProgressBar.Track>
              <ProgressBar.Fill />
            </ProgressBar.Track>
          </ProgressBar>
        ) : null}
      </Card.Content>
    </Card>
  );
}
