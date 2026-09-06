"use client";

import { Label, ListBox, Select } from "@heroui/react";
import type { Course, Topic } from "@/lib/supabase/database.types";

/**
 * The course and topic pickers both importers need.
 *
 * The topic list narrows to the chosen course, and resets when the course
 * changes — a topic under a course you are no longer importing into would be an
 * orphan reference the database would refuse anyway.
 */
export function CourseTopicPicker({
  courseId,
  courses,
  onCourseChange,
  onTopicChange,
  topicId,
  topics,
}: {
  courseId: string;
  courses: Course[];
  onCourseChange: (id: string) => void;
  onTopicChange: (id: string) => void;
  topicId: string;
  topics: Topic[];
}) {
  const available = courseId === "none" ? [] : topics.filter((topic) => topic.course_id === courseId);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Select
        onSelectionChange={(key) => {
          onCourseChange(String(key));
          onTopicChange("none");
        }}
        selectedKey={courseId}
      >
        <Label>Course</Label>
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            <ListBox.Item id="none" textValue="No course">
              No course
            </ListBox.Item>
            {courses.map((course) => (
              <ListBox.Item id={course.id} key={course.id} textValue={course.code}>
                {course.code}
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>

      <Select
        isDisabled={available.length === 0}
        onSelectionChange={(key) => onTopicChange(String(key))}
        selectedKey={topicId}
      >
        <Label>Topic</Label>
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            <ListBox.Item id="none" textValue="No topic">
              No topic
            </ListBox.Item>
            {available.map((topic) => (
              <ListBox.Item id={topic.id} key={topic.id} textValue={topic.title}>
                {topic.title}
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>
    </div>
  );
}
