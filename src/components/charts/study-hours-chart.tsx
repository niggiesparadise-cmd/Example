"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DailyStudyPoint } from "@/data";
import { useChartPalette } from "@/hooks/use-chart-palette";
import { formatShortDate, formatWeekday } from "@/lib/date";
import { formatDuration, minutesToHours } from "@/lib/format";
import { ChartFrame } from "./chart-frame";
import { ChartTooltip } from "./chart-tooltip";

interface StudyHoursChartProps {
  points: DailyStudyPoint[];
  /** Daily target in minutes, drawn as a labelled threshold. */
  goalMinutes: number;
  height?: number;
}

interface ChartDatum {
  date: string;
  hours: number;
  minutes: number;
  focus: number;
}

/**
 * Study hours per day.
 *
 * One series, so it takes the sequential blue and needs no legend — the card's
 * title says what is plotted. The goal line is the only other mark: a threshold,
 * named by the key the card renders beneath the plot.
 */
export function StudyHoursChart({ goalMinutes, height = 220, points }: StudyHoursChartProps) {
  const { isReady, palette } = useChartPalette();
  const color = palette.series[0];
  const goalHours = minutesToHours(goalMinutes);

  const data: ChartDatum[] = points.map((point) => ({
    date: point.date,
    hours: minutesToHours(point.minutes),
    minutes: point.minutes,
    focus: point.focus,
  }));

  const peak = Math.max(goalHours, ...data.map((datum) => datum.hours));
  const upper = Math.ceil((peak + 0.5) / 2) * 2;
  const lastIndex = data.length - 1;

  return (
    <ChartFrame height={height} isReady={isReady}>
      <ResponsiveContainer height="100%" width="100%">
        <AreaChart accessibilityLayer data={data} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
          <CartesianGrid stroke={palette.grid} strokeWidth={1} vertical={false} />
          {/*
            The category key must be the date, not the weekday label: over a
            fortnight the weekdays repeat, and Recharts resolves the tooltip by
            category value — so two "Wed"s would both report the first one.
          */}
          <XAxis
            axisLine={{ stroke: palette.axis }}
            dataKey="date"
            interval="preserveStartEnd"
            minTickGap={12}
            tick={{ fill: palette.muted, fontSize: 11 }}
            tickFormatter={(value: string) => formatWeekday(value)}
            tickLine={false}
            tickMargin={8}
          />
          <YAxis
            axisLine={false}
            domain={[0, upper]}
            tick={{ fill: palette.muted, fontSize: 11 }}
            tickCount={upper / 2 + 1}
            tickFormatter={(value: number) => `${value}h`}
            tickLine={false}
            width={48}
          />
          {/*
            The threshold carries no in-plot label: at narrow widths the text
            landed on the area fill and clipped. The key beneath the chart names
            it instead, where it always has room.
          */}
          <ReferenceLine
            ifOverflow="extendDomain"
            stroke={palette.goal}
            strokeDasharray="4 4"
            y={goalHours}
          />
          <Tooltip
            content={(props) => {
              const datum = props.payload?.[0]?.payload as ChartDatum | undefined;
              if (!props.active || !datum) return null;
              return (
                <ChartTooltip
                  footer={datum.focus > 0 ? `Focus score ${datum.focus}` : "Nothing logged"}
                  rows={[{ label: "Studied", swatch: color, value: formatDuration(datum.minutes) }]}
                  title={formatShortDate(datum.date)}
                />
              );
            }}
            cursor={{ stroke: palette.axis, strokeWidth: 1 }}
          />
          <Area
            activeDot={{ fill: color, r: 5, stroke: palette.surface, strokeWidth: 2 }}
            dataKey="hours"
            dot={(dotProps) => {
              const { cx, cy, index, key } = dotProps as { cx: number; cy: number; index: number; key: string };
              // Only the endpoint is marked — a dot on every day would be noise.
              if (index !== lastIndex) return <g key={key} />;
              return (
                <g key={key}>
                  <circle cx={cx} cy={cy} fill={palette.surface} r={6} />
                  <circle cx={cx} cy={cy} fill={color} r={4} />
                </g>
              );
            }}
            fill={color}
            fillOpacity={0.1}
            isAnimationActive={false}
            name="Study time"
            stroke={color}
            strokeWidth={2}
            type="monotone"
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
