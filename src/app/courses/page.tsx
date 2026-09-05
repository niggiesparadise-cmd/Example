import { BookOpen } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { SectionPlaceholder } from "@/components/ui/section-placeholder";

export const metadata = {
  title: "Courses",
  description: "Every course this term, with syllabus progress, grades and contact hours.",
};

export default function CoursesPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
      <PageHeader description="Every course this term, with syllabus progress, grades and contact hours." title="Courses" />
      <SectionPlaceholder
        description="The Overview page is built first; this section lands next and already has its data model and route in place."
        icon={<BookOpen aria-hidden="true" className="size-6" strokeWidth={1.75} />}
        planned={[
          "Course cards with running grade, attendance and credits",
          "Syllabus breakdown and assessment weighting",
          "Per-course study time and note shortcuts",
        ]}
        title="Courses is next up"
      />
    </div>
  );
}
