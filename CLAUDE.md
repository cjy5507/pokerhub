# Open Poker - Project Instructions

## Overview
Open Poker is a Korean-first bilingual poker community platform built with Next.js 16, Supabase (PostgreSQL), and Drizzle ORM.

## Tech Stack
- **Framework**: Next.js 16.1.6 (App Router)
- **Language**: TypeScript (strict mode)
- **Database**: PostgreSQL via Supabase
- **ORM**: Drizzle ORM 0.45
- **Auth**: Custom JWT (jose) + bcryptjs
- **State**: Zustand
- **Styling**: Tailwind CSS v4 + Radix UI + shadcn/ui
- **Editor**: Tiptap (rich text)
- **Package Manager**: npm

## Project Structure
```
src/
├── app/              # Next.js App Router pages
│   ├── (admin)/      # Admin panel
│   ├── (auth)/       # Login, register
│   ├── (boards)/     # Community boards, news
│   ├── (demo)/       # Design system demo
│   ├── (games)/      # Lottery, roulette
│   ├── (gamification)/ # Attendance, missions, rankings
│   ├── (poker)/      # Hand sharing, analysis
│   ├── (social)/     # Threads, chat
│   ├── (user)/       # Profile, settings, points
│   ├── api/          # API routes (auth, news, poker SSE, upload)
│   ├── poker/        # Live poker tables
│   └── search/       # Search page
├── components/       # Reusable components
│   ├── layout/       # Navigation, footer
│   ├── poker/        # Card rendering, table visualization
│   ├── providers/    # Session provider
│   ├── shared/       # Like button, etc.
│   ├── social/       # Threads components
│   ├── ui/           # shadcn/ui primitives
│   └── user/         # Profile, badges, follow
├── hooks/            # Custom hooks (useAuth)
├── lib/              # Core logic
│   ├── auth/         # Password hashing, session management
│   ├── db/           # Drizzle schema, relations, seed
│   ├── gamification/ # XP, points, badges, missions, levels
│   ├── poker/        # Engine, evaluator, game loop, store
│   ├── queries/      # DB query helpers
│   ├── rss/          # News feed aggregation
│   ├── supabase/     # Supabase client (admin/client/server)
│   ├── utils/        # Utility functions
│   └── validations/  # Zod schemas
├── middleware.ts      # Auth middleware
└── types/            # TypeScript type definitions
```

## Path Alias
`@/*` maps to `./src/*`

## Key Conventions
- Korean-first bilingual: UI in Korean, code in English
- DB schema uses `nameKo`/`nameEn` pattern for bilingual fields
- Server actions in `actions.ts` files within route groups
- Drizzle schema in single file: `src/lib/db/schema.ts`
- Custom auth (no NextAuth) — JWT sessions via jose

## Database
- 30+ tables across 7 domains (user, content, poker, gamification, social, games, admin)
- Schema: `src/lib/db/schema.ts`
- Migrations: `drizzle-kit` commands (`npm run db:generate`, `npm run db:push`)

## Commands
- `npm run dev` — Start development server
- `npm run build` — Production build
- `npm run lint` — ESLint
- `npm run db:push` — Push schema to database
- `npm run db:seed` — Seed database
