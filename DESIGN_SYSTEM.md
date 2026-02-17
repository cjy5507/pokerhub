# PokerHub Design System

A comprehensive mobile-first design system for the Korean Texas Hold'em poker community platform.

## Table of Contents

- [Overview](#overview)
- [Design Philosophy](#design-philosophy)
- [Design Tokens](#design-tokens)
- [Components](#components)
- [Usage Examples](#usage-examples)
- [Accessibility](#accessibility)
- [Performance](#performance)

## Overview

**Tech Stack:**
- Next.js 16 (App Router)
- Tailwind CSS v4
- shadcn/ui components
- TypeScript

**Theme:**
- Dark theme with poker green accents
- Gold primary color (#c9a227)
- Mobile-first responsive design

## Design Philosophy

1. **Mobile-First**: All components are designed for mobile and enhanced for desktop
2. **Touch-Optimized**: Minimum 44px touch targets, swipe gestures, haptic feedback
3. **Dark Theme**: Optimized for low-light poker room environments
4. **Poker-Themed**: Green felt tables, playing card aesthetics, chip colors
5. **Performance**: Lazy loading, reduced motion support, CSS-only animations

## Design Tokens

All design tokens are centralized in `/src/lib/design-tokens.ts`:

### Color Palette

```typescript
// Background layers (darkest to lightest)
background: {
  page: '#121212',      // Main page background
  card: '#1e1e1e',      // Card/component surfaces
  elevated: '#2a2a2a',  // Hover states, elevated elements
  footer: '#0d0d0d',    // Footer, deep backgrounds
}

// Text hierarchy
text: {
  primary: '#e0e0e0',   // Main text
  secondary: '#a0a0a0', // Secondary text
  muted: '#666666',     // Disabled, muted text
}

// Brand gold (primary accent)
gold: {
  DEFAULT: '#c9a227',
  hover: '#d4af37',
  pressed: '#a68523',
}

// Poker-specific colors
poker: {
  felt: '#35654d',      // Table felt green
  border: '#2d5542',    // Table border
  cardRed: '#dc2626',   // Hearts/Diamonds
  cardBlack: '#1a1a1a', // Spades/Clubs
}

// Status colors
status: {
  danger: '#ef4444',
  success: '#22c55e',
  info: '#3b82f6',
  warning: '#f59e0b',
}

// Level tiers
level: {
  bronze: { bg: 'rgba(205, 127, 50, 0.3)', text: '#cd7f32' },
  silver: { bg: 'rgba(192, 192, 192, 0.2)', text: '#c0c0c0' },
  gold: { bg: 'rgba(255, 215, 0, 0.2)', text: '#ffd700' },
  platinum: { bg: 'rgba(229, 228, 226, 0.2)', text: '#e5e4e2' },
  diamond: { bg: 'rgba(185, 242, 255, 0.2)', text: '#b9f2ff' },
}
```

### Typography Scale

```typescript
// Mobile / Desktop
h1: 28px/36px → 36px/44px (bold)
h2: 22px/28px → 28px/36px (semibold)
h3: 18px/24px → 22px/28px (semibold)
body: 15px/22px → 16px/24px (regular)
small: 13px/18px → 14px/20px (regular)
caption: 11px/16px (secondary color)
```

### Spacing & Layout

```typescript
// Container widths
maxWidth: '1560px'
contentWidth: '75%' (desktop)
sidebarWidth: '25%' (desktop)

// Component spacing
cardPadding: 16px (mobile) → 20px (desktop)
sectionGap: 24px (mobile) → 32px (desktop)
gridGap: 12px (mobile) → 16px (desktop)

// Navigation
bottomNav: 60px + safe-area-inset-bottom
header: 56px (mobile) → 64px (desktop)
```

### Breakpoints

```typescript
sm: 640px   // Small mobile landscape
md: 768px   // Tablet portrait
lg: 992px   // CRITICAL: hamburger/bottom-nav toggle
xl: 1280px  // Desktop
2xl: 1560px // Large desktop (max-width)
```

## Components

### Poker Components

#### CardRenderer
Renders playing cards with pure CSS (no images).

**Features:**
- 3 sizes: sm (32x44), md (48x66), lg (64x88)
- Proper suit colors (red/black)
- Face cards with bold styling
- Card back with diamond pattern
- Flip animation support
- Notation parser: `[Ah Kd]` → renders two cards

**Usage:**
```tsx
import { CardRenderer, InlineCards } from '@/components/poker/CardRenderer';

// Single card
<CardRenderer rank="A" suit="h" size="md" />

// Card back
<CardRenderer rank="A" suit="h" faceDown />

// Inline cards from notation
<InlineCards notation="Ah Kd" size="md" />
<InlineCards notation="Qs Jc Ts 7h 2d" size="sm" />
```

#### TableVisualizer
Oval poker table with positioned seats and community cards.

**Features:**
- Responsive scaling (500px max desktop, 100% mobile)
- 6-max and 9-max layouts
- Green felt background with texture
- Player seats with stack sizes
- Dealer button indicator
- Community cards and pot display
- Hero seat highlighting (gold glow)

**Usage:**
```tsx
import { TableVisualizer } from '@/components/poker/TableVisualizer';

<TableVisualizer
  seats={[
    { position: 'BTN', stack: 500, isHero: true, isActive: true },
    { position: 'SB', stack: 300, isFolded: false },
    { position: 'BB', stack: 450 },
  ]}
  communityCards="Ah Kd Qs"
  pot={150}
  maxSeats={6}
/>
```

#### StreetNavigator
Tabbed navigation for preflop/flop/turn/river with action list.

**Features:**
- 4 tabs with active state (gold border)
- Sticky positioning on mobile
- Action list with color-coded types
- Position chips with colors
- Swipe gesture support

**Usage:**
```tsx
import { StreetNavigator } from '@/components/poker/StreetNavigator';

<StreetNavigator
  streets={[
    {
      street: 'preflop',
      actions: [
        { position: 'BTN', type: 'raise', amount: 15 },
        { position: 'SB', type: 'fold' },
        { position: 'BB', type: 'call', amount: 15 },
      ]
    },
    // ... more streets
  ]}
  sticky
/>
```

#### HandCard
Hand history card for list views.

**Features:**
- Shows hero cards + board cards
- Stakes, position, result badges
- Author info with level badge
- Engagement stats (views, likes, comments)
- Gold left border for winning hands
- Responsive (full-width mobile, grid desktop)

**Usage:**
```tsx
import { HandCard } from '@/components/poker/HandCard';

<HandCard
  handId="123"
  heroCards="Ah Kd"
  boardCards="Qs Jc Ts 7h 2d"
  stakes="1/2"
  heroPosition="BTN"
  result="won"
  winAmount={250}
  author={{ userId: 'u1', nickname: 'PokerPro', level: 25 }}
  likes={42}
  comments={8}
  createdAt={new Date()}
/>
```

### Layout Components

#### MobileBottomNav
Fixed bottom navigation with 5 items including hero action button.

**Features:**
- 60px height + safe area padding
- 5 navigation items
- Center "핸드" button with gold circle (larger, raised)
- Active state with gold color
- Hidden on desktop (lg breakpoint)

**Usage:**
```tsx
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';

<MobileBottomNav />
```

### Gamification Components

#### AttendanceCalendar
Monthly calendar with check-in functionality.

**Features:**
- 7-column grid (일~토)
- Checked days with gold background
- Today with pulsing border animation
- Streak counter with fire emoji
- Check-in button (gold gradient)
- Completed state with green success color

**Usage:**
```tsx
import { AttendanceCalendar } from '@/components/gamification/AttendanceCalendar';

<AttendanceCalendar
  year={2024}
  month={2}
  days={generateCalendarDays()}
  currentStreak={7}
  onCheckIn={handleCheckIn}
  isCheckedToday={false}
/>
```

#### MissionCard
Daily/weekly mission with progress tracking.

**Features:**
- Icon + title + description
- Progress bar with percentage
- Current/target display
- Reward points badge
- "보상 받기" button when completed
- Special gold border for daily bonus completion

**Usage:**
```tsx
import { MissionCard } from '@/components/gamification/MissionCard';
import { Heart } from 'lucide-react';

<MissionCard
  id="mission-1"
  title="첫 게시글 작성"
  description="게시판에 게시글 1개 작성하기"
  icon={Heart}
  current={0}
  target={1}
  reward={100}
  status="active"
  onClaim={handleClaimReward}
/>
```

### User Components

#### AuthorBadge
User level badge + nickname (clickable to profile).

**Features:**
- Level tier colors (Bronze → Diamond)
- Compact mode for smaller displays
- Clickable link to profile
- Pill-shaped level badge

**Usage:**
```tsx
import { AuthorBadge } from '@/components/user/AuthorBadge';

<AuthorBadge
  userId="user-123"
  nickname="PokerPro"
  level={25}
  compact={false}
/>
```

### Board Components

#### PostRow
Post list item with responsive layout.

**Features:**
- Desktop: table row layout
- Mobile: card layout
- Pinned icon support
- Visited state (dimmed title)
- Engagement stats
- Author badge integration

**Usage:**
```tsx
import { PostRow } from '@/components/board/PostRow';

<PostRow
  postId="post-123"
  boardSlug="general"
  title="첫 라이브 게임 후기"
  author={{ userId: 'u1', nickname: 'PokerPro', level: 15 }}
  createdAt={new Date()}
  views={234}
  likes={42}
  commentCount={8}
  isPinned={false}
/>
```

### Shared Components

#### LikeButton
Heart icon with count, optimistic updates.

**Features:**
- Optimistic UI updates
- Debounced API calls
- Scale animation on like
- Red heart fill when liked
- Number formatting (k/M)
- 3 sizes (sm/md/lg)

**Usage:**
```tsx
import { LikeButton } from '@/components/shared/LikeButton';

<LikeButton
  targetId="post-123"
  targetType="post"
  initialLikes={42}
  initialIsLiked={false}
  onLikeChange={(isLiked, count) => console.log(isLiked, count)}
  showCount
  size="md"
/>
```

## Animations

All animations are defined in `globals.css`:

```css
@keyframes cardFlip {
  /* 180deg Y-axis rotation */
}

@keyframes levelUp {
  /* Scale from 0.5 → 1.2 → 1 with fade in */
}

@keyframes pulse-gold {
  /* Gold box-shadow pulse */
}

@keyframes likePop {
  /* Scale pop: 1 → 1.3 → 1 */
}

@keyframes fireGlow {
  /* Text shadow glow for streak fire */
}

@keyframes slideUpFade {
  /* Slide up 10px with fade in */
}
```

All animations respect `prefers-reduced-motion`.

## Accessibility

### Touch Targets
- Minimum 44px height/width on all interactive elements
- Increased spacing between touch targets on mobile

### ARIA Labels
- All buttons have proper `aria-label`
- Tab navigation uses `aria-current="page"`
- Icons have descriptive labels

### Keyboard Navigation
- All interactive elements are focusable
- Focus visible with outline-ring/50
- Skip links (TODO) for main content

### Screen Readers
- Semantic HTML (nav, article, section)
- Proper heading hierarchy
- Alt text on images

### Color Contrast
- All text meets WCAG AA standards
- Status colors have sufficient contrast
- Focus indicators are clearly visible

## Performance

### Lazy Loading
- Images use Next.js Image component with lazy loading
- Blur placeholders for better UX

### CSS-Only Animations
- Most animations use pure CSS
- No JavaScript animation libraries
- GPU-accelerated transforms

### Code Splitting
- All components use 'use client' only when necessary
- Server components by default
- Dynamic imports for heavy components (TODO)

### Reduced Motion
- All animations disabled when `prefers-reduced-motion: reduce`
- Fallback to instant transitions

## File Structure

```
src/
├── components/
│   ├── poker/
│   │   ├── CardRenderer.tsx
│   │   ├── TableVisualizer.tsx
│   │   ├── StreetNavigator.tsx
│   │   └── HandCard.tsx
│   ├── gamification/
│   │   ├── AttendanceCalendar.tsx
│   │   └── MissionCard.tsx
│   ├── user/
│   │   └── AuthorBadge.tsx
│   ├── board/
│   │   └── PostRow.tsx
│   ├── shared/
│   │   └── LikeButton.tsx
│   └── layout/
│       └── MobileBottomNav.tsx
├── lib/
│   ├── design-tokens.ts
│   └── utils.ts
└── app/
    └── globals.css
```

## Future Enhancements

- [ ] Dark/light mode toggle (currently dark-only)
- [ ] Animation variants (subtle/normal/playful)
- [ ] Custom cursor for desktop
- [ ] Skeleton loading states
- [ ] Toast notification system
- [ ] Modal/Dialog components
- [ ] Form components
- [ ] Table component for hand history
- [ ] Chart components for stats
- [ ] Badge/Achievement components

## Contributing

When adding new components:

1. Follow mobile-first approach
2. Use design tokens from `design-tokens.ts`
3. Add proper TypeScript types
4. Include accessibility attributes
5. Document in this file
6. Add usage examples

## License

Proprietary - PokerHub 2024
