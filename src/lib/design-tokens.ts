/**
 * PokerHub Design System - Design Tokens
 * Premium dark poker theme with gold accents
 * Mobile-first poker community
 */

// ============================================================
// COLORS
// ============================================================

export const colors = {
  // Background layers (darkest to lightest)
  background: {
    deep: '#0a0a0a',       // Deepest: poker lobby, modals backdrop
    page: '#121212',       // Default page background
    header: '#1a1a1a',     // Header, section headers
    card: '#1e1e1e',       // Cards, panels, sidebars
    elevated: '#2a2a2a',   // Hover states, elevated surfaces
    footer: '#0d0d0d',     // Footer background
  },

  // Text hierarchy
  text: {
    primary: '#e0e0e0',    // Main body text
    secondary: '#a0a0a0',  // Labels, descriptions
    muted: '#666666',      // Placeholder, disabled
    dim: '#888888',        // Metadata, timestamps
    inverse: '#000000',    // Text on gold/light backgrounds
  },

  // Brand gold (primary accent)
  gold: {
    DEFAULT: '#c9a227',    // Primary gold
    hover: '#d4af37',      // Hover state
    pressed: '#a68523',    // Active/pressed state
    light: '#f4e5b8',      // Light gold for subtle highlights
    dim: 'rgba(201, 162, 39, 0.2)',  // Gold overlay/glow bg
    glow: 'rgba(201, 162, 39, 0.4)', // Gold glow effect
  },

  // Borders
  border: {
    DEFAULT: '#333333',    // Standard borders
    subtle: '#222222',     // Subtle dividers
    medium: '#444444',     // Medium emphasis
    focus: '#c9a227',      // Focus ring color
  },

  // Poker table colors
  poker: {
    felt: '#35654d',       // Table felt green
    feltDark: '#2d5542',   // Table border green
    enterButton: '#0d7c50', // Join table CTA
    enterHover: '#0a6340', // Join table hover
    cardRed: '#dc2626',    // Red suits (hearts, diamonds)
    cardBlack: '#1a1a1a',  // Black suits (spades, clubs)
    cardWhite: '#e0e0e0',  // Card text for dark bg
  },

  // Status / Semantic colors
  status: {
    success: '#22c55e',
    successDim: 'rgba(34, 197, 94, 0.15)',
    danger: '#ef4444',
    dangerDim: 'rgba(239, 68, 68, 0.15)',
    warning: '#eab308',
    warningDim: 'rgba(234, 179, 8, 0.15)',
    info: '#3b82f6',
    infoDim: 'rgba(59, 130, 246, 0.15)',
  },

  // Overlay
  overlay: {
    black60: 'rgba(0, 0, 0, 0.6)',
    black80: 'rgba(0, 0, 0, 0.8)',
  },

  // Level tier colors (gamification)
  level: {
    bronze: {
      bg: 'rgba(205, 127, 50, 0.3)',
      text: '#cd7f32',
    },
    silver: {
      bg: 'rgba(192, 192, 192, 0.2)',
      text: '#c0c0c0',
    },
    gold: {
      bg: 'rgba(255, 215, 0, 0.2)',
      text: '#ffd700',
    },
    platinum: {
      bg: 'rgba(229, 228, 226, 0.2)',
      text: '#e5e4e2',
    },
    diamond: {
      bg: 'rgba(185, 242, 255, 0.2)',
      text: '#b9f2ff',
    },
  },
} as const;

// ============================================================
// TYPOGRAPHY
// ============================================================

export const typography = {
  fontFamily: {
    sans: 'var(--font-sans)',
    mono: 'var(--font-mono)',
  },

  // Type scale (mobile / desktop)
  scale: {
    h1: {
      mobile: { size: '28px', lineHeight: '36px', weight: '700' },
      desktop: { size: '36px', lineHeight: '44px', weight: '700' },
    },
    h2: {
      mobile: { size: '22px', lineHeight: '28px', weight: '600' },
      desktop: { size: '28px', lineHeight: '36px', weight: '600' },
    },
    h3: {
      mobile: { size: '18px', lineHeight: '24px', weight: '600' },
      desktop: { size: '22px', lineHeight: '28px', weight: '600' },
    },
    body: {
      mobile: { size: '15px', lineHeight: '22px', weight: '400' },
      desktop: { size: '16px', lineHeight: '24px', weight: '400' },
    },
    small: {
      mobile: { size: '13px', lineHeight: '18px', weight: '400' },
      desktop: { size: '14px', lineHeight: '20px', weight: '400' },
    },
    caption: {
      size: '11px',
      lineHeight: '16px',
      weight: '400',
      color: colors.text.secondary,
    },
  },

  // Font weights
  weight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    black: '900',
  },
} as const;

// ============================================================
// SPACING
// ============================================================

export const spacing = {
  // Spacing scale (4px base)
  scale: {
    '0': '0px',
    '0.5': '2px',
    '1': '4px',
    '1.5': '6px',
    '2': '8px',
    '2.5': '10px',
    '3': '12px',
    '4': '16px',
    '5': '20px',
    '6': '24px',
    '8': '32px',
    '10': '40px',
    '12': '48px',
    '16': '64px',
  },

  // Layout containers
  layout: {
    maxWidth: '1560px',
    contentWidth: '75%',
    sidebarWidth: '300px',
  },

  // Component spacing
  component: {
    cardPadding: {
      mobile: '16px',
      desktop: '20px',
    },
    sectionGap: {
      mobile: '24px',
      desktop: '32px',
    },
    gridGap: {
      mobile: '12px',
      desktop: '16px',
    },
  },

  // Navigation heights
  navigation: {
    bottomNav: '60px',
    header: {
      mobile: '56px',
      desktop: '64px',
    },
    safeArea: 'env(safe-area-inset-bottom)',
  },
} as const;

// ============================================================
// BREAKPOINTS
// ============================================================

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '992px',   // Critical: hamburger/bottom-nav toggle
  xl: '1280px',
  '2xl': '1560px',
} as const;

// ============================================================
// BORDER RADIUS
// ============================================================

export const borderRadius = {
  none: '0px',
  sm: '4px',      // Card corners, small elements
  DEFAULT: '6px', // Buttons, inputs
  md: '8px',      // Medium panels
  lg: '12px',     // Large cards, modals
  xl: '16px',     // Feature cards, hero elements
  '2xl': '24px',  // Lottery cards, special elements
  pill: '9999px', // Pills, tags, circular buttons
} as const;

// ============================================================
// SHADOWS
// ============================================================

export const shadows = {
  sm: '0 1px 2px rgba(0, 0, 0, 0.2)',
  card: '0 2px 4px rgba(0, 0, 0, 0.3)',
  elevated: '0 4px 8px rgba(0, 0, 0, 0.4)',
  modal: '0 8px 24px rgba(0, 0, 0, 0.6)',
  glow: {
    gold: '0 0 12px rgba(201, 162, 39, 0.4)',
    goldStrong: '0 0 20px rgba(201, 162, 39, 0.6)',
    success: '0 0 12px rgba(34, 197, 94, 0.4)',
    danger: '0 0 12px rgba(239, 68, 68, 0.4)',
    info: '0 0 12px rgba(59, 130, 246, 0.4)',
  },
} as const;

// ============================================================
// PLAYING CARD SIZES
// ============================================================

export const cardSize = {
  sm: { width: '32px', height: '44px' },
  md: { width: '48px', height: '66px' },
  lg: { width: '64px', height: '88px' },
} as const;

// ============================================================
// TOUCH TARGETS
// ============================================================

export const touchTarget = {
  min: '44px',
} as const;

// ============================================================
// ANIMATION
// ============================================================

export const animation = {
  duration: {
    instant: '0ms',
    fast: '150ms',
    normal: '250ms',
    slow: '350ms',
    slower: '500ms',
  },
  easing: {
    default: 'cubic-bezier(0.4, 0, 0.2, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
} as const;

// ============================================================
// Z-INDEX SCALE
// ============================================================

export const zIndex = {
  base: 0,
  dropdown: 10,
  sticky: 20,
  overlay: 30,
  header: 40,
  bottomNav: 50,
  modal: 50,
  toast: 60,
  tooltip: 70,
} as const;

// ============================================================
// COMBINED THEME EXPORT
// ============================================================

export const theme = {
  colors,
  typography,
  spacing,
  breakpoints,
  borderRadius,
  shadows,
  cardSize,
  touchTarget,
  animation,
  zIndex,
} as const;

export type Theme = typeof theme;
