/**
 * Responsive breakpoints for the whole application — three tiers only.
 *
 * phone   ≤ 640 px
 * tablet  641 px – 1024 px
 * desktop ≥ 1025 px
 *
 * Allowed @media values in CSS modules:
 *   @media (max-width: 640px)   { ... }  // phone
 *   @media (max-width: 1024px)  { ... }  // tablet and below
 *   @media (min-width: 641px)   { ... }  // tablet and above
 *   @media (min-width: 1025px)  { ... }  // desktop only
 *
 * See src/styles/breakpoints.ts (this file) and src/app/globals.css for
 * the canonical values. Do not hardcode other pixel values in media queries.
 */

export const bp = {
  phone:   640,
  tablet: 1024,
  desktop: 1280,
} as const;

export type Breakpoint = keyof typeof bp;

/** Pre-built media-query strings for window.matchMedia / useBreakpoint. */
export const mq = {
  phone:      `(max-width: ${bp.phone}px)`,
  tablet:     `(max-width: ${bp.tablet}px)`,
  desktop:    `(max-width: ${bp.desktop}px)`,
  tabletUp:   `(min-width: ${bp.phone   + 1}px)`,
  desktopUp:  `(min-width: ${bp.tablet  + 1}px)`,
} as const;
