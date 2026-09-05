import { Disclosure } from "@heroui/react";
import { PieChart } from "lucide-react";
import { CourseHoursChart } from "@/components/charts/course-hours-chart";
import { CourseDot } from "@/components/ui/course-dot";
import { SectionCard } from "@/components/ui/section-card";
import { studyByCourse } from "@/data";
import { TODAY, startOfWeek } from "@/lib/date";
import { formatDuration, formatPercent } from "@/lib/format";

/**
 * Where this week's study time went.
 *
 * The bar labels carry the numbers, and the disclosure below repeats them as a
 * table — so the chart is readable without depending on its colours.
 */
export function StudyBreakdown() {
  const weekStart = startOfWeek(TODAY);
  // `studyByCourse` ranks by time — useful for the headline, but the chart and
  // the table below it both read in fixed course order (see CourseHoursChart).
  const ranked = studyByCourse(weekStart, TODAY);
  const totals = [...ranked].sort((a, b) => a.course.colorSlot - b.course.colorSlot);
  const busiest = ranked[0];

  return (
    <SectionCard
      description={
        busiest && busiest.minutes > 0
          ? `${busiest.course.code} is taking the most time this week`
          : "Nothing logged yet this week"
      }
      icon={<PieChart aria-hidden="true" className="size-[18px]" strokeWidth={1.85} />}
      title="Time by course"
    >
      <CourseHoursChart totals={totals} />

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
              <caption className="sr-only">Study time by course this week</caption>
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted">
                  <th className="py-1.5 font-medium" scope="col">
                    Course
                  </th>
                  <th className="py-1.5 text-right font-medium" scope="col">
                    Time
                  </th>
                  <th className="py-1.5 text-right font-medium" scope="col">
                    Share
                  </th>
                </tr>
              </thead>
              <tbody>
                {totals.map((total) => (
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
    </SectionCard>
  );
}
