import { CalendarDays } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { SectionPlaceholder } from "@/components/ui/section-placeholder";

export const metadata = {
  title: "Schedule",
  description: "The week's lectures, labs, seminars and study blocks.",
};

export default function SchedulePage() {
  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
      <PageHeader description="The week's lectures, labs, seminars and study blocks." title="Schedule" />
      <SectionPlaceholder
        description="The Overview page is built first; this section lands next and already has its data model and route in place."
        icon={<CalendarDays aria-hidden="true" className="size-6" strokeWidth={1.75} />}
        planned={[
          "Week and day views of the timetable",
          "Conflict and gap detection between sessions",
          "Study blocks scheduled around timetabled teaching",
        ]}
        title="Schedule is next up"
      />
    </div>
  );
}
