"use client";

import { Badge, Button, Dropdown, Header, SearchField, Separator } from "@heroui/react";
import { Bell, GraduationCap, LogOut, Plus, Settings, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { site } from "@/config/site";
import { useAuth } from "@/features/auth/auth-provider";
import { useProfile } from "@/features/profile/use-profile";
import { UserAvatar } from "@/features/profile/user-avatar";
import { ThemeToggle } from "./theme-toggle";

/**
 * Sticky application bar.
 *
 * Holds the brand on mobile (where the sidebar is gone), search from `sm` up,
 * and the theme, notification and account controls at every width.
 */
export function Topbar() {
  const { signOut, user } = useAuth();
  const { data: profile } = useProfile();
  const router = useRouter();

  return (
    /*
     * The top bar uses the same translucency as the floating navigation, so
     * content scrolling under either behaves the same way. Its background is
     * the glass fallback where `backdrop-filter` is unavailable, which keeps
     * the title and controls legible rather than letting the page show through.
     */
    <header className="glass-lit sticky top-0 z-20 border-b border-[var(--glass-border-outer)] bg-[var(--glass-fallback)] pt-[env(safe-area-inset-top)] supports-[backdrop-filter]:bg-[var(--glass-bg-strong)] supports-[backdrop-filter]:backdrop-blur-[var(--glass-blur)] supports-[backdrop-filter]:backdrop-saturate-[var(--glass-saturate)]">
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
              {/* The uploaded picture where there is one, initials otherwise. */}
              <UserAvatar size="sm" />
            </Button>
            <Dropdown.Popover placement="bottom end">
              <Dropdown.Menu>
                <Dropdown.Section>
                  <Header className="px-2 py-1.5">
                    <span className="block text-sm font-medium text-foreground">
                      {profile?.full_name ?? "Your account"}
                    </span>
                    <span className="block text-xs text-muted">{user?.email}</span>
                  </Header>
                  <Dropdown.Item href="/settings/" id="profile" textValue="Profile">
                    <User aria-hidden="true" className="size-4 text-muted" strokeWidth={1.85} />
                    Profile
                  </Dropdown.Item>
                  <Dropdown.Item href="/settings/" id="settings" textValue="Settings">
                    <Settings aria-hidden="true" className="size-4 text-muted" strokeWidth={1.85} />
                    Settings
                  </Dropdown.Item>
                  <Dropdown.Item
                    id="sign-out"
                    onAction={() => {
                      void signOut().then(() => router.replace("/sign-in/"));
                    }}
                    textValue="Sign out"
                    variant="danger"
                  >
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
