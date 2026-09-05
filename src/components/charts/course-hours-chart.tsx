"use client";

import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { CourseStudyTotal } from "@/data";
import { useChartPalette } from "@/hooks/use-chart-palette";
import { formatDuration, formatPercent, minutesToHours } from "@/lib/format";
import { ChartFrame } from "./chart-frame";
import { ChartTooltip } from "./chart-tooltip";

interface CourseHoursChartProps {
  totals: CourseStudyTotal[];
  height?: number;
}

interface ChartDatum {
  code: string;
  title: string;
  hours: number;
  minutes: number;
  share: number;
  color: string;
}

/**
 * Study time per course.
 *
 * Each bar wears its course's own colour — identity that follows the course, so
 * re-sorting never repaints it. The bars are drawn in palette-slot order rather
 * than by size on purpose: ranking them by hours would seat yellow next to
 * orange, a pair that fails both the colour-vision and normal-vision gates in
 * dark mode. Slot order is the validated adjacency, and the bars still share a
 * baseline, so magnitude reads fine without re-ordering.
 *
 * Three of the light-mode slots sit below 3:1 against the card, so every bar is
 * directly labelled and the same figures repeat in the table beneath the chart —
 * colour is never load-bearing.
 */
export function CourseHoursChart({ height = 220, totals }: CourseHoursChartProps) {
  const { isReady, palette } = useChartPalette();

  const data: ChartDatum[] = [...totals]
    .sort((a, b) => a.course.colorSlot - b.course.colorSlot)
    .map((total) => ({
      code: total.course.code,
      title: total.course.title,
      hours: minutesToHours(total.minutes),
      minutes: total.minutes,
      share: total.share,
      color: palette.series[total.course.colorSlot - 1],
    }));

  const peak = Math.max(1, ...data.map((datum) => datum.hours));

  return (
    <ChartFrame height={height} isReady={isReady}>
      <ResponsiveContainer height="100%" width="100%">
        <BarChart
          accessibilityLayer
          barCategoryGap="28%"
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 44, bottom: 0, left: 0 }}
        >
          <XAxis dataKey="hours" domain={[0, peak * 1.15]} hide type="number" />
          <YAxis
            axisLine={false}
            dataKey="code"
            tick={{ fill: palette.muted, fontSize: 11 }}
            tickLine={false}
            type="category"
            width={86}
          />
          <Tooltip
            content={(props) => {
              const datum = props.payload?.[0]?.payload as ChartDatum | undefined;
              if (!props.active || !datum) return null;
              return (
                <ChartTooltip
                  footer={`${formatPercent(datum.share)} of this week's study time`}
                  rows={[{ label: "Studied", swatch: datum.color, value: formatDuration(datum.minutes) }]}
                  title={datum.title}
                />
              );
            }}
            cursor={{ fill: palette.grid, fillOpacity: 0.4 }}
          />
          <Bar
            barSize={18}
            dataKey="hours"
            isAnimationActive={false}
            name="Hours studied"
            radius={[0, 4, 4, 0]}
          >
            {data.map((datum) => (
              <Cell key={datum.code} fill={datum.color} />
            ))}
            <LabelList
              dataKey="hours"
              fill={palette.muted}
              fontSize={11}
              formatter={(value) => (typeof value === "number" ? `${value}h` : "")}
              offset={8}
              position="right"
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
