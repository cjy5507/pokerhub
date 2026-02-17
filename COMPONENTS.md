# PokerHub Component Index

Quick reference for all design system components.

## Poker Components

### CardRenderer
**File:** `src/components/poker/CardRenderer.tsx`

Renders playing cards with pure CSS.

```tsx
import { CardRenderer, InlineCards } from '@/components/poker';

// Single card
<CardRenderer rank="A" suit="h" size="md" />

// Multiple cards
<InlineCards notation="Ah Kd Qs" size="md" />

// Card back
<CardRenderer rank="A" suit="h" faceDown />
```

**Props:**
- `rank`: 'A' | 'K' | 'Q' | 'J' | 'T' | '9'-'2'
- `suit`: 'h' | 'd' | 's' | 'c'
- `size`: 'sm' | 'md' | 'lg'
- `faceDown`: boolean

---

### TableVisualizer
**File:** `src/components/poker/TableVisualizer.tsx`

Oval poker table with positioned seats.

```tsx
import { TableVisualizer } from '@/components/poker';

<TableVisualizer
  seats={[
    { position: 'BTN', stack: 500, isHero: true },
    { position: 'SB', stack: 300 }
  ]}
  communityCards="Ah Kd Qs"
  pot={150}
  maxSeats={6}
/>
```

**Props:**
- `seats`: PlayerSeat[]
- `communityCards`: string (optional)
- `pot`: number (optional)
- `maxSeats`: 6 | 9

---

### StreetNavigator
**File:** `src/components/poker/StreetNavigator.tsx`

Tabbed navigation for preflop/flop/turn/river.

```tsx
import { StreetNavigator } from '@/components/poker';

<StreetNavigator
  streets={[
    {
      street: 'preflop',
      actions: [
        { position: 'BTN', type: 'raise', amount: 15 }
      ]
    }
  ]}
  sticky
/>
```

**Props:**
- `streets`: StreetData[]
- `sticky`: boolean

---

### HandCard
**File:** `src/components/poker/HandCard.tsx`

Hand history card for list views.

```tsx
import { HandCard } from '@/components/poker';

<HandCard
  handId="123"
  heroCards="Ah Kd"
  boardCards="Qs Jc Ts"
  stakes="1/2"
  heroPosition="BTN"
  result="won"
  winAmount={250}
  author={{ userId: 'u1', nickname: 'Pro', level: 25 }}
  likes={42}
  comments={8}
  createdAt={new Date()}
/>
```

---

## Gamification Components

### AttendanceCalendar
**File:** `src/components/gamification/AttendanceCalendar.tsx`

Monthly attendance tracker with check-in.

```tsx
import { AttendanceCalendar } from '@/components/gamification';

<AttendanceCalendar
  year={2024}
  month={2}
  days={calendarDays}
  currentStreak={7}
  onCheckIn={handleCheckIn}
  isCheckedToday={false}
/>
```

---

### MissionCard
**File:** `src/components/gamification/MissionCard.tsx`

Mission with progress tracking.

```tsx
import { MissionCard } from '@/components/gamification';
import { Heart } from 'lucide-react';

<MissionCard
  id="m1"
  title="첫 게시글 작성"
  icon={Heart}
  current={0}
  target={1}
  reward={100}
  status="active"
  onClaim={handleClaim}
/>
```

**Status:** 'active' | 'completed' | 'claimed'

---

## User Components

### AuthorBadge
**File:** `src/components/user/AuthorBadge.tsx`

User level badge + nickname.

```tsx
import { AuthorBadge } from '@/components/user';

<AuthorBadge
  userId="user-123"
  nickname="PokerPro"
  level={25}
  compact={false}
/>
```

**Level Tiers:**
- Bronze: 1-9
- Silver: 10-24
- Gold: 25-49
- Platinum: 50-99
- Diamond: 100+

---

## Board Components

### PostRow
**File:** `src/components/board/PostRow.tsx`

Post list item with responsive layout.

```tsx
import { PostRow } from '@/components/board';

<PostRow
  postId="p1"
  boardSlug="general"
  title="첫 라이브 게임 후기"
  author={{ userId: 'u1', nickname: 'Pro', level: 15 }}
  createdAt={new Date()}
  views={234}
  likes={42}
  commentCount={8}
  isPinned={false}
/>
```

---

## Shared Components

### LikeButton
**File:** `src/components/shared/LikeButton.tsx`

Heart button with optimistic updates.

```tsx
import { LikeButton } from '@/components/shared';

<LikeButton
  targetId="post-123"
  targetType="post"
  initialLikes={42}
  onLikeChange={(isLiked, count) => console.log(isLiked, count)}
  showCount
  size="md"
/>
```

**Sizes:** 'sm' | 'md' | 'lg'

---

## Layout Components

### MobileBottomNav
**File:** `src/components/layout/MobileBottomNav.tsx`

Fixed bottom navigation (hidden on desktop).

```tsx
import { MobileBottomNav } from '@/components/layout';

<MobileBottomNav />
```

**Items:**
- 홈 (Home)
- 게시판 (Board)
- 핸드 (Hands) - Hero button
- 랭킹 (Rankings)
- 프로필 (Profile)

---

## Design Tokens

Import design tokens for consistent styling:

```tsx
import { colors, typography, spacing } from '@/lib/design-tokens';

// Use in styles
<div style={{ color: colors.gold.DEFAULT }}>

// Or reference in Tailwind
<div className="text-[#c9a227]">
```

---

## Common Patterns

### Responsive Grid

```tsx
<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
  {items.map(item => <Card key={item.id} {...item} />)}
</div>
```

### Mobile-First Sizing

```tsx
<div className="
  text-sm lg:text-base     {/* Font size */}
  p-4 lg:p-6               {/* Padding */}
  w-full lg:w-1/2          {/* Width */}
">
```

### Conditional Classes

```tsx
import { cn } from '@/lib/utils';

<div className={cn(
  'base-class',
  condition && 'conditional-class',
  size === 'lg' && 'large-class'
)} />
```

---

## Animation Classes

Use built-in animations:

```tsx
<div className="animate-[cardFlip_300ms_ease-out]">
<div className="animate-[likePop_300ms_ease-out]">
<div className="animate-[pulse-gold_2s_infinite]">
```

---

## File Paths

All components saved to `/Users/joejaeyoung/bcr/pokerhub/src/components/`

**Absolute imports work:**
```tsx
import { Component } from '@/components/category';
```

**Relative imports work:**
```tsx
import { Component } from '../components/category';
```
