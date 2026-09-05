"use client";

import { Avatar, Badge, Button, Dropdown, Header, SearchField, Separator } from "@heroui/react";
import { Bell, GraduationCap, LogOut, Plus, Settings, User } from "lucide-react";
import Link from "next/link";
import { site } from "@/config/site";
import { student } from "@/data";
import { ThemeToggle } from "./theme-toggle";

/**
 * Sticky application bar.
 *
 * Holds the brand on mobile (where the sidebar is gone), search from `sm` up,
 * and the theme, notification and account controls at every width.
 */
export function Topbar() {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/85 pt-[env(safe-area-inset-top)] backdrop-blur-md">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Link
          aria-label={`${site.name} — ${site.tagline}`}
          className="flex items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-background md:hidden"
          href="/"
        >
          <span className="flex size-9 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <GraduationCap aria-hidden="true" className="size-5" strokeWidth={2} />
          </span>
          <span className="font-display text-lg leading-none font-semibold">{site.name}</span>
        </Link>

        <SearchField aria-label="Search courses, tasks and notes" className="hidden max-w-sm flex-1 sm:flex">
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input placeholder="Search courses, tasks, notes…" />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <Button className="max-sm:hidden" size="sm" variant="primary">
            <Plus aria-hidden="true" className="size-4" strokeWidth={2.25} />
            New task
          </Button>

          <ThemeToggle />

          <Badge.Anchor>
            <Button aria-label="Notifications, 3 unread" isIconOnly size="sm" variant="ghost">
              <Bell aria-hidden="true" className="size-[18px]" strokeWidth={1.85} />
            </Button>
            <Badge aria-hidden="true" color="danger" placement="top-right" size="sm">
              3
            </Badge>
          </Badge.Anchor>

          <Separator className="mx-1 h-6 self-center max-sm:hidden" orientation="vertical" />

          <Dropdown>
            <Button aria-label="Account menu" className="rounded-full p-0.5" isIconOnly size="sm" variant="ghost">
              <Avatar size="sm">
                <Avatar.Fallback>{student.avatarInitials}</Avatar.Fallback>
              </Avatar>
            </Button>
            <Dropdown.Popover placement="bottom end">
              <Dropdown.Menu>
                <Dropdown.Section>
                  <Header className="px-2 py-1.5">
                    <span className="block text-sm font-medium text-foreground">{student.name}</span>
                    <span className="block text-xs text-muted">
                      {student.program} · {student.year}
                    </span>
                  </Header>
                  <Dropdown.Item id="profile" textValue="Profile">
                    <User aria-hidden="true" className="size-4 text-muted" strokeWidth={1.85} />
                    Profile
                  </Dropdown.Item>
                  <Dropdown.Item id="settings" textValue="Settings">
                    <Settings aria-hidden="true" className="size-4 text-muted" strokeWidth={1.85} />
                    Settings
                  </Dropdown.Item>
                  <Dropdown.Item id="sign-out" textValue="Sign out" variant="danger">
                    <LogOut aria-hidden="true" className="size-4" strokeWidth={1.85} />
                    Sign out
                  </Dropdown.Item>
                </Dropdown.Section>
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        </div>
      </div>
    </header>
  );
}
