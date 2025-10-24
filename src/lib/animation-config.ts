/**
 * Centralized Animation Configuration
 *
 * This file provides consistent animation values across the entire application.
 * Use these constants to ensure uniform motion and loading states.
 */

/**
 * Animation Durations (in milliseconds)
 */
export const ANIMATION_DURATION = {
  /** Fast animations for small elements (buttons, badges) */
  FAST: 200,
  /** Standard animations for most UI elements */
  NORMAL: 300,
  /** Slower animations for large sections */
  SLOW: 500,
  /** Very slow animations for complex transitions */
  VERY_SLOW: 700,
} as const

/**
 * Animation Delays (in milliseconds)
 * Used for staggering animations
 */
export const ANIMATION_DELAY = {
  /** No delay */
  NONE: 0,
  /** Small delay for second element */
  SMALL: 100,
  /** Medium delay for third element */
  MEDIUM: 200,
  /** Large delay for fourth element */
  LARGE: 300,
  /** Extra large delay for fifth element */
  XLARGE: 400,
} as const

/**
 * Stagger delay calculator
 * Returns delay based on index position
 *
 * @example
 * getStaggerDelay(0) // 0ms
 * getStaggerDelay(1) // 50ms
 * getStaggerDelay(2) // 100ms
 */
export function getStaggerDelay(index: number, baseDelay = 50): number {
  return index * baseDelay
}

/**
 * Tailwind Animation Classes
 *
 * Use these for simple, performant CSS animations.
 * Recommended for most cases.
 */
export const TAILWIND_ANIMATIONS = {
  /** Fade in from top (header elements) */
  FADE_IN_TOP: 'animate-in fade-in-50 slide-in-from-top-2 duration-500',

  /** Fade in from bottom (content sections) */
  FADE_IN_BOTTOM: 'animate-in fade-in-50 slide-in-from-bottom-2 duration-500',

  /** Fade in from left (list items, cards) */
  FADE_IN_LEFT: 'animate-in fade-in-50 slide-in-from-left-2 duration-300',

  /** Fade in from right (sidebar, panels) */
  FADE_IN_RIGHT: 'animate-in fade-in-50 slide-in-from-right-2 duration-300',

  /** Simple fade in (modals, overlays) */
  FADE_IN: 'animate-in fade-in-50 duration-300',

  /** Zoom in (popups, tooltips) */
  ZOOM_IN: 'animate-in zoom-in-95 duration-200',

  /** Pulse (loading indicators) */
  PULSE: 'animate-pulse',

  /** Spin (loading spinners) */
  SPIN: 'animate-spin',
} as const

/**
 * Framer Motion Variants
 *
 * Use these for complex animations that need programmatic control.
 * Only use when Tailwind animations are insufficient.
 */
export const MOTION_VARIANTS = {
  /** Fade in from top */
  fadeInTop: {
    initial: { opacity: 0, y: -20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  },

  /** Fade in from bottom */
  fadeInBottom: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 },
  },

  /** Fade in from left */
  fadeInLeft: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  },

  /** Fade in from right */
  fadeInRight: {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
  },

  /** Simple fade */
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },

  /** Scale up */
  scaleUp: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
  },
} as const

/**
 * Motion Transition Configs
 */
export const MOTION_TRANSITIONS = {
  /** Fast spring animation */
  spring: {
    type: 'spring' as const,
    stiffness: 300,
    damping: 30,
  },

  /** Smooth tween animation */
  smooth: {
    type: 'tween' as const,
    ease: 'easeOut' as const,
    duration: 0.3,
  },

  /** Slower smooth animation */
  smoothSlow: {
    type: 'tween' as const,
    ease: 'easeOut' as const,
    duration: 0.5,
  },
} as const

/**
 * Standard Page Animation Pattern
 *
 * Apply this pattern to all pages for consistency:
 * - Header: fade in from top
 * - First section: fade in from bottom with small delay
 * - Subsequent sections: stagger with increasing delays
 */
export const PAGE_ANIMATIONS = {
  header: TAILWIND_ANIMATIONS.FADE_IN_TOP,
  firstSection: TAILWIND_ANIMATIONS.FADE_IN_BOTTOM,

  /** Get animation class for section by index */
  getSection: (index: number) => ({
    className: TAILWIND_ANIMATIONS.FADE_IN_BOTTOM,
    style: { animationDelay: `${getStaggerDelay(index + 1)}ms` },
  }),
} as const

/**
 * Helper to create staggered list item animations
 *
 * @example
 * const items = data.map((item, i) => (
 *   <div key={item.id} {...getListItemAnimation(i)}>
 *     {item.name}
 *   </div>
 * ))
 */
export function getListItemAnimation(index: number, baseDelay = 50) {
  return {
    className: TAILWIND_ANIMATIONS.FADE_IN_LEFT,
    style: { animationDelay: `${getStaggerDelay(index, baseDelay)}ms` },
  }
}
