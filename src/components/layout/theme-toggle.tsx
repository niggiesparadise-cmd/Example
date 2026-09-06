"use client";

import { Button, Dropdown, useIsHydrated } from "@heroui/react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

const options = [
  { key: "light", label: "Light", icon: Sun },
  { key: "dark", label: "Dark", icon: Moon },
  { key: "system", label: "System", icon: Monitor },
] as const;

/** Light / dark / system switcher for the top bar. */
export function ThemeToggle() {
  const { setTheme, theme, resolvedTheme } = useTheme();
  const isHydrated = useIsHydrated();

  // Before hydration the stored preference is unknown, so render a fixed icon
  // and an empty selection — otherwise the markup would not match the server's.
  const Icon = !isHydrated ? Sun : resolvedTheme === "dark" ? Moon : Sun;

  return (
    <Dropdown>
      <Button aria-label="Change colour theme" isIconOnly size="sm" variant="ghost">
        <Icon aria-hidden="true" className="size-[18px]" strokeWidth={1.85} />
      </Button>
      <Dropdown.Popover placement="bottom end">
        <Dropdown.Menu
          disallowEmptySelection
          onSelectionChange={(keys) => {
            const [next] = [...keys];
            if (typeof next === "string") setTheme(next);
          }}
          selectedKeys={isHydrated && theme ? [theme] : []}
          selectionMode="single"
        >
          {options.map((option) => (
            <Dropdown.Item key={option.key} id={option.key} textValue={option.label}>
              <option.icon aria-hidden="true" className="size-4 text-muted" strokeWidth={1.85} />
              {option.label}
              <Dropdown.ItemIndicator />
            </Dropdown.Item>
          ))}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}
