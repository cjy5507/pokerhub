# Open Poker Design System - Quick Start

## 🚀 Getting Started in 2 Minutes

### 1. View the Design System
Visit the live showcase:
```bash
npm run dev
# Navigate to http://localhost:3000/design-system
```

### 2. Import Components

```tsx
// All poker components
import {
  CardRenderer,
  InlineCards,
  TableVisualizer,
  StreetNavigator,
  HandCard
} from '@/components/poker';

// Gamification
import { AttendanceCalendar, MissionCard } from '@/components/gamification';

// User components
import { AuthorBadge } from '@/components/user';

// Board components
import { PostRow } from '@/components/board';

// Shared components
import { LikeButton } from '@/components/shared';

// Layout
import { MobileBottomNav } from '@/components/layout';
```

### 3. Use Design Tokens

```tsx
import { colors, typography, spacing } from '@/lib/design-tokens';

// In your component
<div style={{ color: colors.gold.DEFAULT }}>
  Gold text
</div>
```

## 📦 Common Patterns

### Render Playing Cards

```tsx
// Single card
<CardRenderer rank="A" suit="h" size="md" />

// Multiple cards from notation
<InlineCards notation="Ah Kd Qs" size="md" />

// Card back
<CardRenderer rank="A" suit="h" size="md" faceDown />
```

### Show Poker Table

```tsx
<TableVisualizer
  seats={[
    { position: 'BTN', stack: 500, isHero: true },
    { position: 'SB', stack: 300 },
    { position: 'BB', stack: 450 }
  ]}
  communityCards="Ah Kd Qs"
  pot={150}
  maxSeats={6}
/>
```

### Street Navigation

```tsx
<StreetNavigator
  streets={[
    {
      street: 'preflop',
      actions: [
        { position: 'BTN', type: 'raise', amount: 15 },
        { position: 'SB', type: 'fold' }
      ]
    }
  ]}
  sticky
/>
```

### User Level Badge

```tsx
<AuthorBadge
  userId="user-123"
  nickname="PokerPro"
  level={25}
/>
```

### Like Button

```tsx
<LikeButton
  targetId="post-123"
  targetType="post"
  initialLikes={42}
  onLikeChange={(isLiked, newCount) => {
    console.log('Liked:', isLiked, 'Count:', newCount);
  }}
/>
```

## 🎨 Color Reference

```tsx
// Use in className
className="bg-[#121212] text-[#e0e0e0]"

// Or import from tokens
import { colors } from '@/lib/design-tokens';
style={{ backgroundColor: colors.background.page }}
```

### Quick Colors
- Background: `#121212` (page), `#1e1e1e` (card), `#2a2a2a` (elevated)
- Gold: `#c9a227` (primary accent)
- Text: `#e0e0e0` (primary), `#a0a0a0` (secondary), `#666666` (muted)
- Success: `#22c55e`
- Danger: `#ef4444`
- Info: `#3b82f6`

## 📱 Responsive Design

```tsx
// Mobile-first approach
<div className="
  w-full          {/* Mobile: full width */}
  p-4             {/* Mobile: 16px padding */}
  lg:w-1/2        {/* Desktop: half width */}
  lg:p-6          {/* Desktop: 24px padding */}
">
  Content
</div>
```

### Breakpoints
- `sm:` 640px
- `md:` 768px
- `lg:` 992px ⭐ CRITICAL: mobile/desktop toggle
- `xl:` 1280px
- `2xl:` 1560px

## 🎯 Common Tasks

### Add Bottom Nav to Layout

```tsx
// app/layout.tsx
import { MobileBottomNav } from '@/components/layout';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <MobileBottomNav />
      </body>
    </html>
  );
}
```

### Create a Hand List Page

```tsx
// app/hands/page.tsx
import { HandCard } from '@/components/poker';

export default function HandsPage() {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {hands.map(hand => (
        <HandCard
          key={hand.id}
          handId={hand.id}
          heroCards={hand.heroCards}
          boardCards={hand.boardCards}
          stakes={hand.stakes}
          heroPosition={hand.position}
          result={hand.result}
          winAmount={hand.winAmount}
          author={hand.author}
          likes={hand.likes}
          comments={hand.commentCount}
          createdAt={hand.createdAt}
        />
      ))}
    </div>
  );
}
```

### Build a Post List

```tsx
// app/board/[slug]/page.tsx
import { PostRow } from '@/components/board';

export default function BoardPage({ posts }) {
  return (
    <div className="bg-[#1e1e1e] rounded-lg divide-y divide-[#333]">
      {posts.map(post => (
        <PostRow
          key={post.id}
          postId={post.id}
          boardSlug={post.boardSlug}
          title={post.title}
          author={post.author}
          createdAt={post.createdAt}
          views={post.views}
          likes={post.likes}
          commentCount={post.commentCount}
          isPinned={post.isPinned}
        />
      ))}
    </div>
  );
}
```

## 🎭 Animations

Use built-in animation classes:

```tsx
// Card flip
<div className="animate-[cardFlip_300ms_ease-out]">

// Like pop
<div className="animate-[likePop_300ms_ease-out]">

// Pulse gold (for today's attendance)
<div className="animate-[pulse-gold_2s_infinite]">

// Fire glow (for streaks)
<span className="animate-[fireGlow_2s_infinite]">🔥</span>
```

## 🔧 Utilities

### cn() - Merge Tailwind Classes

```tsx
import { cn } from '@/lib/utils';

<div className={cn(
  'base-class',
  condition && 'conditional-class',
  'override-class'
)} />
```

### Card Notation Parser

```tsx
import { parseCard } from '@/components/poker';

const card = parseCard('Ah'); // { rank: 'A', suit: 'h' }
```

## 📚 Full Documentation

- **Complete Guide:** [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md)
- **Implementation Details:** [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)
- **Live Examples:** Visit `/design-system` route

## 💡 Tips

1. **Always mobile-first:** Start with mobile sizing, add `lg:` for desktop
2. **Use design tokens:** Import from `@/lib/design-tokens` instead of hardcoding
3. **Touch targets:** Keep buttons at least 44px on mobile
4. **Accessibility:** Add aria-labels to all interactive elements
5. **Animations:** All animations respect `prefers-reduced-motion`

## 🐛 Troubleshooting

### Components not rendering?
- Check if you added `'use client'` directive
- Verify imports are from correct paths
- Ensure lucide-react icons are installed

### Styles not applying?
- Verify Tailwind CSS is configured correctly
- Check if custom animations are in globals.css
- Ensure design tokens file exists

### Mobile nav not showing?
- Check you're on mobile breakpoint (< 992px)
- Verify component is in layout, not inside page
- Check z-index isn't being overridden

## 🎯 Next Steps

1. Integrate components into your pages
2. Customize design tokens for your brand
3. Add your own components following the patterns
4. Test on real devices (iOS/Android)
5. Run accessibility audit

---

**Ready to build?** Start with the `/design-system` route to see everything in action!
