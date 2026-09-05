import { NotebookPen } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { SectionPlaceholder } from "@/components/ui/section-placeholder";

export const metadata = {
  title: "Notes",
  description: "Lecture notebooks and revision summaries across every course.",
};

export default function NotesPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
      <PageHeader description="Lecture notebooks and revision summaries across every course." title="Notes" />
      <SectionPlaceholder
        description="The Overview page is built first; this section lands next and already has its data model and route in place."
        icon={<NotebookPen aria-hidden="true" className="size-6" strokeWidth={1.75} />}
        planned={[
          "Notebooks grouped by course and tag",
          "Full-text search across every note",
          "Pinned notes and revision summaries",
        ]}
        title="Notes is next up"
      />
    </div>
  );
}
