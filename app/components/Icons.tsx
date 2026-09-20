import type { ReactElement } from "react";

/**
 * Inline SVG icons.
 *
 * These are components rather than files in public/ because they inherit
 * `currentColor`: every one of them changes colour with the theme and with
 * button hover states, which an <img> cannot do. They were previously pasted
 * into the JSX at their use sites, where ~70 lines of path data sat between
 * one button and the next and made the page's structure impossible to skim.
 *
 * Every icon is marked `aria-hidden`: each one sits next to a text label or
 * inside a control that already carries an accessible name, so announcing it
 * would make screen readers repeat the label.
 */

interface IconProps {
  /** Square edge length in pixels. Defaults match the original call sites. */
  size?: number;
}

/** Shared attributes for the stroke-drawn icons. */
const STROKE = {
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

function Svg({ size, children }: { size: number; children: ReactElement }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      {children}
    </svg>
  );
}

/** Floppy disk with a check: history saving is on. */
export function SaveOnIcon({ size = 18 }: IconProps) {
  return (
    <Svg size={size}>
      <g>
        <path d="M5 4h12l2 3v13H5z" {...STROKE} strokeWidth="1.7" />
        <path d="M9 4v5h6V4m-6 11l2.2 2.2L17 11" {...STROKE} strokeWidth="1.7" />
      </g>
    </Svg>
  );
}

/** Floppy disk struck through: history saving is off. */
export function SaveOffIcon({ size = 18 }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M5 4h12l2 3v13H5zM4 4l16 16" {...STROKE} strokeWidth="1.7" />
    </Svg>
  );
}

/** Sun: shown while the light theme is active. */
export function SunIcon({ size = 18 }: IconProps) {
  return (
    <Svg size={size}>
      <path
        d="M12 4v2m0 12v2m8-8h-2M6 12H4m12.95-5.66l-1.41 1.41M8.46 16.54l-1.41 1.41m0-11.8l1.41 1.41m8.08 8.08l1.41 1.41M12 8.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Z"
        {...STROKE}
        strokeWidth="1.7"
      />
    </Svg>
  );
}

/** Crescent moon: shown while the dark theme is active. */
export function MoonIcon({ size = 18 }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79Z" {...STROKE} strokeWidth="1.7" />
    </Svg>
  );
}

/** Angle brackets: the Computer Science subject chip. */
export function CodeIcon({ size = 18 }: IconProps) {
  return (
    <Svg size={size}>
      <path
        d="M8.5 6.5L4 12l4.5 5.5M15.5 6.5L20 12l-4.5 5.5M11 18h2"
        {...STROKE}
        strokeWidth="1.7"
      />
    </Svg>
  );
}

/** Upload arrow into a tray: the drop zone. */
export function UploadIcon({ size = 22 }: IconProps) {
  return (
    <Svg size={size}>
      <path
        d="M12 16V8m0 0l-3 3m3-3l3 3M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2"
        {...STROKE}
        strokeWidth="1.5"
      />
    </Svg>
  );
}

/** Magnifying glass: the primary "Provide Guidance" action. */
export function SearchIcon({ size = 18 }: IconProps) {
  return (
    <Svg size={size}>
      <path
        d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
        {...STROKE}
        strokeWidth="1.7"
      />
    </Svg>
  );
}

/** Cross: clearing the current prompt, and clearing saved history. */
export function CloseIcon({ size = 16 }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M6 6l12 12M18 6L6 18" {...STROKE} strokeWidth="1.8" />
    </Svg>
  );
}
