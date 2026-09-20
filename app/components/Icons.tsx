import type { ReactNode } from "react";

/**
 * Inline SVG icons.
 *
 * These are components rather than files in public/ because they inherit
 * `currentColor`: every one changes colour with the theme and with button
 * hover states, which an <img> cannot do. They were previously pasted into the
 * JSX at their use sites, where ~70 lines of path data sat between one button
 * and the next and made the page's structure impossible to skim.
 */

interface IconProps {
  /** Square edge length in pixels. Defaults match the original call sites. */
  size?: number;
}

/**
 * How an icon is exposed to assistive technology.
 *
 * Three values because the original used three, inconsistently: some icons
 * carried `role="presentation"`, some `aria-hidden="true"`, and some nothing
 * at all. All three hide a decorative graphic in practice, and every icon here
 * sits inside a control that already has an accessible name, so the choice has
 * no user-visible effect — but it is reproduced per icon so the rendered
 * markup is unchanged. Worth unifying on `aria-hidden` separately.
 */
type Presentation = "presentation" | "hidden" | "none";

function presentationAttrs(mode: Presentation) {
  if (mode === "presentation") return { role: "presentation" as const };
  if (mode === "hidden") return { "aria-hidden": true as const };
  return {};
}

/**
 * Stroke attributes, emitted in the original's key order.
 *
 * Order is preserved so the serialised markup matches the pre-refactor output
 * exactly, which is what lets the two be diffed as a no-op.
 */
function stroke(width: string) {
  return {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: width,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
}

function Svg({
  size,
  presentation,
  children,
}: {
  size: number;
  presentation: Presentation;
  children: ReactNode;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...presentationAttrs(presentation)}>
      {children}
    </svg>
  );
}

/** Floppy disk with a check: history saving is on. */
export function SaveOnIcon({ size = 18 }: IconProps) {
  return (
    <Svg size={size} presentation="presentation">
      <path d="M5 4h12l2 3v13H5z" {...stroke("1.7")} />
      <path d="M9 4v5h6V4m-6 11l2.2 2.2L17 11" {...stroke("1.7")} />
    </Svg>
  );
}

/** Floppy disk struck through: history saving is off. */
export function SaveOffIcon({ size = 18 }: IconProps) {
  return (
    <Svg size={size} presentation="presentation">
      <path d="M5 4h12l2 3v13H5zM4 4l16 16" {...stroke("1.7")} />
    </Svg>
  );
}

/** Sun: shown while the light theme is active. */
export function SunIcon({ size = 18 }: IconProps) {
  return (
    <Svg size={size} presentation="presentation">
      <path
        d="M12 4v2m0 12v2m8-8h-2M6 12H4m12.95-5.66l-1.41 1.41M8.46 16.54l-1.41 1.41m0-11.8l1.41 1.41m8.08 8.08l1.41 1.41M12 8.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Z"
        {...stroke("1.7")}
      />
    </Svg>
  );
}

/** Crescent moon: shown while the dark theme is active. */
export function MoonIcon({ size = 18 }: IconProps) {
  return (
    <Svg size={size} presentation="presentation">
      <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79Z" {...stroke("1.7")} />
    </Svg>
  );
}

/** Angle brackets: the Computer Science subject chip. */
export function CodeIcon({ size = 18 }: IconProps) {
  return (
    <Svg size={size} presentation="none">
      <path d="M8.5 6.5L4 12l4.5 5.5M15.5 6.5L20 12l-4.5 5.5M11 18h2" {...stroke("1.7")} />
    </Svg>
  );
}

/** Upload arrow into a tray: the drop zone. */
export function UploadIcon({ size = 22 }: IconProps) {
  return (
    <Svg size={size} presentation="hidden">
      <path
        d="M12 16V8m0 0l-3 3m3-3l3 3M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2"
        {...stroke("1.5")}
      />
    </Svg>
  );
}

/** Magnifying glass: the primary "Provide Guidance" action. */
export function SearchIcon({ size = 18 }: IconProps) {
  return (
    <Svg size={size} presentation="hidden">
      <path
        d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
        {...stroke("1.7")}
      />
    </Svg>
  );
}

/** Cross: clearing the current prompt, and clearing saved history. */
export function CloseIcon({ size = 16 }: IconProps) {
  return (
    <Svg size={size} presentation="none">
      <path d="M6 6l12 12M18 6L6 18" {...stroke("1.8")} />
    </Svg>
  );
}
