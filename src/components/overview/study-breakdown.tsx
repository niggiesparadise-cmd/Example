"use client";

import { Disclosure } from "@heroui/react";
import { PieChart } from "lucide-react";
import { CourseHoursChart } from "@/components/charts/course-hours-chart";
import { NoData } from "@/components/ui/data-states";
import { CourseDot } from "@/components/ui/course-dot";
import { SectionCard } from "@/components/ui/section-card";
import type { CourseStudyTotal } from "@/features/analytics/api";
import { formatDuration, formatPercent } from "@/lib/format";

/** Where study time went, per course. */
export function StudyBreakdown({ totals }: { totals: CourseStudyTotal[] }) {
  const withTime = totals.filter((total) => total.minutes > 0);
  const busiest = withTime[0];
  // Slot order, not size order: ranking by hours would seat yellow beside
  // orange, a pair that fails the colour-vision gates in dark mode.
  const ordered = [...totals].sort((a, b) => a.course.color_slot - b.course.color_slot);

  return (
    <SectionCard
      description={
        busiest ? `${busiest.course.code} is taking the most time` : "No study time recorded yet"
      }
      icon={<PieChart aria-hidden="true" className="size-[18px]" strokeWidth={1.85} />}
      title="Time by course"
    >
      {withTime.length === 0 ? (
        <NoData
          description="Log a study session against a course to see the split."
          icon={<PieChart aria-hidden="true" className="size-5" strokeWidth={1.75} />}
          title="Nothing to break down"
        />
      ) : (
        <>
          <CourseHoursChart totals={ordered} />
          <Disclosure className="mt-1">
            <Disclosure.Heading>
              <Disclosure.Trigger className="flex w-full items-center gap-2 text-sm font-medium text-muted hover:text-foreground">
                Show the figures
                <Disclosure.Indicator />
              </Disclosure.Trigger>
            </Disclosure.Heading>
            <Disclosure.Content>
              <Disclosure.Body>
                <table className="w-full text-sm">
                  <caption className="sr-only">Study time by course</caption>
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted">
                      <th className="py-1.5 font-medium" scope="col">Course</th>
                      <th className="py-1.5 text-right font-medium" scope="col">Time</th>
                      <th className="py-1.5 text-right font-medium" scope="col">Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ordered.map((total) => (
                      <tr key={total.course.id} className="border-b border-border/60 last:border-0">
                        <th className="py-2 text-left font-normal" scope="row">
                          <span className="flex items-center gap-2">
                            <CourseDot course={total.course} />
                            <span className="text-foreground">{total.course.code}</span>
                          </span>
                        </th>
                        <td className="tabular py-2 text-right text-foreground">{formatDuration(total.minutes)}</td>
                        <td className="tabular py-2 text-right text-muted">{formatPercent(total.share)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Disclosure.Body>
            </Disclosure.Content>
          </Disclosure>
        </>
      )}
    </SectionCard>
  );
}
