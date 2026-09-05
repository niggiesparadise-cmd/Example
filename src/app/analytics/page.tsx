import { ChartNoAxesColumn } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { SectionPlaceholder } from "@/components/ui/section-placeholder";

export const metadata = {
  title: "Analytics",
  description: "Study patterns, focus scores and where the term's hours are going.",
};

export default function AnalyticsPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
      <PageHeader description="Study patterns, focus scores and where the term's hours are going." title="Analytics" />
      <SectionPlaceholder
        description="The Overview page is built first; this section lands next and already has its data model and route in place."
        icon={<ChartNoAxesColumn aria-hidden="true" className="size-6" strokeWidth={1.75} />}
        planned={[
          "Study time by course, week and time of day",
          "Focus scores against session length",
          "Goal streaks and term-over-term comparison",
        ]}
        title="Analytics is next up"
      />
    </div>
  );
}
