"use client";

import { Button, Dropdown, useIsHydrated } from "@heroui/react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useCallback, useRef } from "react";

const options = [
  { key: "light", label: "Light", icon: Sun },
  { key: "dark", label: "Dark", icon: Moon },
  { key: "system", label: "System", icon: Monitor },
] as const;

/** How long the overlay lives, matching `--duration-theme-wipe` in globals.css. */
const WIPE_MS = 620;

/**
 * Light / dark / system switcher.
 *
 * Changing theme plays a circular reveal that starts at this button and grows
 * until it covers the screen; the theme swaps underneath while it is covered,
 * and the circle fades to show the result. The colour of the circle is the
 * theme being *left*, so the effect reads as the old appearance being wiped
 * away rather than a flash of something unrelated.
 *
 * It is one absolutely-positioned element animating `transform` and `opacity`,
 * appended to `<body>` and removed when it finishes. Nothing else on the page
 * is touched: no layout, no scroll change, no repaint of the dialogs or the
 * navigation underneath.
 */
export function ThemeToggle() {
  const { setTheme, theme, resolvedTheme } = useTheme();
  const isHydrated = useIsHydrated();
  const buttonRef = useRef<HTMLButtonElement>(null);

  const Icon = !isHydrated ? Sun : resolvedTheme === "dark" ? Moon : Sun;

  const changeTheme = useCallback(
    (next: string) => {
      const button = buttonRef.current;
      const canAnimate =
        typeof window !== "undefined" &&
        button !== null &&
        // A no-op change has nothing to reveal.
        next !== theme;

      if (!canAnimate) {
        setTheme(next);
        return;
      }

      const rect = button.getBoundingClientRect();
      const originX = rect.left + rect.width / 2;
      const originY = rect.top + rect.height / 2;

      /*
       * How far the circle must grow to cover the viewport from that point:
       * the distance to the furthest corner. The circle starts 2px across, so
       * the scale factor is that radius, plus a little slack for rounding.
       */
      const furthest = Math.hypot(
        Math.max(originX, window.innerWidth - originX),
        Math.max(originY, window.innerHeight - originY),
      );
      const scale = Math.ceil(furthest) + 8;

      /*
       * The colour of the theme being left behind — read from the live page
       * rather than hardcoded, so it is right whatever the palette is and
       * whichever direction the change goes in.
       */
      const leaving = getComputedStyle(document.body).backgroundColor;

      const overlay = document.createElement("div");
      overlay.className = "theme-wipe";
      overlay.setAttribute("aria-hidden", "true");
      overlay.style.left = `${originX}px`;
      overlay.style.top = `${originY}px`;
      overlay.style.backgroundColor = leaving;
      overlay.style.setProperty("--theme-wipe-scale", String(scale));

      document.body.append(overlay);

      /*
       * Swap the theme once the circle has grown over the point it started
       * from. The overlay is opaque by then, so the change itself is never
       * visible — what the eye sees is the old appearance being carried away.
       *
       * `applyTheme` is idempotent and every exit runs it, because the timing
       * of the two events is not fixed: under `prefers-reduced-motion` the
       * overlay's animation is replaced by a short crossfade that finishes
       * *before* the scheduled swap, and a cleanup that only cancelled the
       * timer would remove the overlay having never changed the theme at all.
       */
      let applied = false;
      const applyTheme = () => {
        if (applied) return;
        applied = true;
        setTheme(next);
      };

      const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
      const swapAt = window.setTimeout(
        applyTheme,
        // Nothing is travelling under reduced motion, so there is nothing to
        // hide behind: change it at once and let the overlay fade off it.
        reducedMotion ? 0 : Math.round(WIPE_MS * 0.4),
      );

      const finish = () => {
        window.clearTimeout(swapAt);
        applyTheme();
        overlay.remove();
      };

      overlay.addEventListener("animationend", finish, { once: true });
      // A backstop for the case where the animation never runs at all — a
      // background tab, an old WebView — so a stuck overlay can never sit on
      // top of the app, and the theme still changes.
      window.setTimeout(() => {
        if (overlay.isConnected) finish();
      }, WIPE_MS + 200);
    },
    [setTheme, theme],
  );

  return (
    <Dropdown>
      <Button aria-label="Change colour theme" isIconOnly ref={buttonRef} size="sm" variant="ghost">
        <Icon
          aria-hidden="true"
          className="size-[18px] transition-transform duration-[var(--duration-glass)] ease-[var(--ease-glass)]"
          strokeWidth={1.85}
        />
      </Button>
      <Dropdown.Popover placement="bottom end">
        <Dropdown.Menu
          disallowEmptySelection
          onSelectionChange={(keys) => {
            const [next] = [...keys];
            if (typeof next === "string") changeTheme(next);
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
