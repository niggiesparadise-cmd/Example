"use client";

import type { ReactNode } from "react";

interface ChartTooltipProps {
  title: string;
  /** One row per value; `swatch` is the mark's colour, when there is one. */
  rows: { label: string; value: string; swatch?: string }[];
  footer?: ReactNode;
}

/**
 * The shared tooltip surface for every chart.
 *
 * Values wear text tokens; identity comes from the small swatch beside them,
 * never from colouring the text itself.
 */
export function ChartTooltip({ footer, rows, title }: ChartTooltipProps) {
  return (
    <div className="pointer-events-none min-w-40 rounded-xl border border-border bg-overlay p-3 shadow-overlay">
      <p className="text-xs font-medium text-foreground">{title}</p>
      <dl className="mt-2 flex flex-col gap-1.5">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-4">
            <dt className="flex items-center gap-1.5 text-xs text-muted">
              {row.swatch ? (
                <span
                  aria-hidden="true"
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: row.swatch }}
                />
              ) : null}
              {row.label}
            </dt>
            <dd className="tabular text-xs font-medium text-foreground">{row.value}</dd>
          </div>
        ))}
      </dl>
      {footer ? <p className="mt-2 border-t border-border pt-2 text-xs text-muted">{footer}</p> : null}
    </div>
  );
}
