import { GraduationCap } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { SectionPlaceholder } from "@/components/ui/section-placeholder";

export const metadata = {
  title: "Exams",
  description: "Assessment dates, weighting and how revision is tracking.",
};

export default function ExamsPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
      <PageHeader description="Assessment dates, weighting and how revision is tracking." title="Exams" />
      <SectionPlaceholder
        description="The Overview page is built first; this section lands next and already has its data model and route in place."
        icon={<GraduationCap aria-hidden="true" className="size-6" strokeWidth={1.75} />}
        planned={[
          "Countdown per assessment with revision progress",
          "Topic checklists drawn from the syllabus",
          "Grade impact modelling for each remaining exam",
        ]}
        title="Exams is next up"
      />
    </div>
  );
}
