import { ListChecks } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { SectionPlaceholder } from "@/components/ui/section-placeholder";

export const metadata = {
  title: "Tasks",
  description: "Assignments, readings and problem sets, sorted by what is due next.",
};

export default function TasksPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
      <PageHeader description="Assignments, readings and problem sets, sorted by what is due next." title="Tasks" />
      <SectionPlaceholder
        description="The Overview page is built first; this section lands next and already has its data model and route in place."
        icon={<ListChecks aria-hidden="true" className="size-6" strokeWidth={1.75} />}
        planned={[
          "Board and list views with priority and course filters",
          "Checklists, estimates and time actually spent",
          "Overdue and due-today grouping",
        ]}
        title="Tasks is next up"
      />
    </div>
  );
}
