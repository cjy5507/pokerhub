import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '디자인 시스템 | Open Poker',
  description: '오픈포커 디자인 시스템 컴포넌트 모음.',
};

export const dynamic = 'force-dynamic';

import { CardRenderer, InlineCards } from '@/components/poker/CardRenderer';
import { TableVisualizer } from '@/components/poker/TableVisualizer';
import { StreetNavigator } from '@/components/poker/StreetNavigator';
import { HandCard } from '@/components/poker/HandCard';
import { AttendanceCalendar } from '@/components/gamification/AttendanceCalendar';
import { MissionCard } from '@/components/gamification/MissionCard';
import { AuthorBadge } from '@/components/user/AuthorBadge';
import { PostRow } from '@/components/board/PostRow';
import { LikeButton } from '@/components/shared/LikeButton';
import { Heart, MessageSquare, Trophy, Spade } from 'lucide-react';

/* ----------------------------------------------------------
 * Color swatch helper (server component, no client JS)
 * ---------------------------------------------------------- */
function Swatch({
  name,
  hex,
  cssVar,
  dark = false,
}: {
  name: string;
  hex: string;
  cssVar?: string;
  dark?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="w-12 h-12 rounded-md border border-op-border flex-shrink-0"
        style={{ backgroundColor: hex }}
      />
      <div className="min-w-0">
        <div className={`text-sm font-medium ${dark ? 'text-op-text-inverse' : 'text-op-text'}`}>
          {name}
        </div>
        <div className="text-xs text-op-text-muted font-mono">{hex}</div>
        {cssVar && (
          <div className="text-xs text-op-text-dim font-mono">{cssVar}</div>
        )}
      </div>
    </div>
  );
}

function TypographySample({
  label,
  className,
  text,
}: {
  label: string;
  className: string;
  text: string;
}) {
  return (
    <div className="flex items-baseline gap-4">
      <span className="w-16 text-xs text-op-text-muted flex-shrink-0">{label}</span>
      <span className={className}>{text}</span>
    </div>
  );
}

export default function DesignSystemPage() {
  const today = new Date();
  const sampleDays = Array.from({ length: 28 }, (_, i) => {
    const date = new Date(today.getFullYear(), today.getMonth(), i + 1);
    const isToday = date.getDate() === today.getDate();
    return {
      date,
      isChecked: i < 7,
      isToday,
      isFuture: date > today,
      isInStreak: i < 7,
    };
  });

  return (
    <div className="min-h-screen bg-op-bg p-4 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-16">
        {/* ======== HEADER ======== */}
        <header className="text-center py-10 border-b border-op-border">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Spade className="w-8 h-8 text-op-gold" fill="currentColor" />
            <h1 className="text-3xl lg:text-4xl font-bold text-op-gold">
              Open Poker Design System
            </h1>
          </div>
          <p className="text-op-text-secondary text-lg">
            Premium dark poker theme &mdash; design tokens, colors, typography & components
          </p>
        </header>

        {/* ======== 1. COLOR PALETTE ======== */}
        <section>
          <h2 className="text-2xl font-bold text-op-text mb-2">Colors</h2>
          <p className="text-op-text-secondary mb-6 text-sm">
            All colors are available as Tailwind utilities (e.g. <code className="text-op-gold">bg-op-surface</code>, <code className="text-op-gold">text-op-gold</code>) and CSS variables (e.g. <code className="text-op-gold">var(--color-op-gold)</code>).
          </p>

          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            {/* Backgrounds */}
            <div className="bg-op-surface rounded-lg p-6 border border-op-border">
              <h3 className="text-sm font-semibold text-op-text-secondary mb-4 uppercase tracking-wider">
                Backgrounds
              </h3>
              <div className="space-y-3">
                <Swatch name="Deep" hex="#0a0a0a" cssVar="--color-op-deep" />
                <Swatch name="Page" hex="#121212" cssVar="--color-op-bg" />
                <Swatch name="Header" hex="#1a1a1a" cssVar="--color-op-header" />
                <Swatch name="Surface / Card" hex="#1e1e1e" cssVar="--color-op-surface" />
                <Swatch name="Elevated" hex="#2a2a2a" cssVar="--color-op-elevated" />
                <Swatch name="Footer" hex="#0d0d0d" cssVar="--color-op-footer" />
              </div>
            </div>

            {/* Text */}
            <div className="bg-op-surface rounded-lg p-6 border border-op-border">
              <h3 className="text-sm font-semibold text-op-text-secondary mb-4 uppercase tracking-wider">
                Text
              </h3>
              <div className="space-y-3">
                <Swatch name="Primary" hex="#e0e0e0" cssVar="--color-op-text" />
                <Swatch name="Secondary" hex="#a0a0a0" cssVar="--color-op-text-secondary" />
                <Swatch name="Muted" hex="#888888" cssVar="--color-op-text-muted" />
                <Swatch name="Dim" hex="#666666" cssVar="--color-op-text-dim" />
                <Swatch name="Inverse" hex="#000000" cssVar="--color-op-text-inverse" />
              </div>
            </div>

            {/* Brand Gold */}
            <div className="bg-op-surface rounded-lg p-6 border border-op-border">
              <h3 className="text-sm font-semibold text-op-text-secondary mb-4 uppercase tracking-wider">
                Brand Gold
              </h3>
              <div className="space-y-3">
                <Swatch name="Gold" hex="#c9a227" cssVar="--color-op-gold" />
                <Swatch name="Gold Hover" hex="#d4af37" cssVar="--color-op-gold-hover" />
                <Swatch name="Gold Pressed" hex="#a68523" cssVar="--color-op-gold-pressed" />
                <Swatch name="Gold Light" hex="#f4e5b8" cssVar="--color-op-gold-light" />
              </div>
            </div>

            {/* Borders */}
            <div className="bg-op-surface rounded-lg p-6 border border-op-border">
              <h3 className="text-sm font-semibold text-op-text-secondary mb-4 uppercase tracking-wider">
                Borders
              </h3>
              <div className="space-y-3">
                <Swatch name="Subtle" hex="#222222" cssVar="--color-op-border-subtle" />
                <Swatch name="Default" hex="#333333" cssVar="--color-op-border" />
                <Swatch name="Medium" hex="#444444" cssVar="--color-op-border-medium" />
              </div>
            </div>

            {/* Status */}
            <div className="bg-op-surface rounded-lg p-6 border border-op-border">
              <h3 className="text-sm font-semibold text-op-text-secondary mb-4 uppercase tracking-wider">
                Status
              </h3>
              <div className="space-y-3">
                <Swatch name="Success" hex="#22c55e" cssVar="--color-op-success" />
                <Swatch name="Error / Danger" hex="#ef4444" cssVar="--color-op-error" />
                <Swatch name="Warning" hex="#eab308" cssVar="--color-op-warning" />
                <Swatch name="Info" hex="#3b82f6" cssVar="--color-op-info" />
              </div>
            </div>

            {/* Poker Table */}
            <div className="bg-op-surface rounded-lg p-6 border border-op-border">
              <h3 className="text-sm font-semibold text-op-text-secondary mb-4 uppercase tracking-wider">
                Poker Table
              </h3>
              <div className="space-y-3">
                <Swatch name="Felt" hex="#35654d" cssVar="--color-op-felt" />
                <Swatch name="Felt Dark" hex="#2d5542" cssVar="--color-op-felt-dark" />
                <Swatch name="Enter" hex="#0d7c50" cssVar="--color-op-enter" />
                <Swatch name="Card Red" hex="#dc2626" cssVar="--color-op-card-red" />
              </div>
            </div>

            {/* Level Tiers */}
            <div className="bg-op-surface rounded-lg p-6 border border-op-border md:col-span-2 xl:col-span-3">
              <h3 className="text-sm font-semibold text-op-text-secondary mb-4 uppercase tracking-wider">
                Level Tiers
              </h3>
              <div className="flex flex-wrap gap-4">
                {[
                  { name: 'Bronze', hex: '#cd7f32', bg: 'rgba(205,127,50,0.3)' },
                  { name: 'Silver', hex: '#c0c0c0', bg: 'rgba(192,192,192,0.2)' },
                  { name: 'Gold', hex: '#ffd700', bg: 'rgba(255,215,0,0.2)' },
                  { name: 'Platinum', hex: '#e5e4e2', bg: 'rgba(229,228,226,0.2)' },
                  { name: 'Diamond', hex: '#b9f2ff', bg: 'rgba(185,242,255,0.2)' },
                ].map((tier) => (
                  <div
                    key={tier.name}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg"
                    style={{ backgroundColor: tier.bg }}
                  >
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: tier.hex }} />
                    <span className="text-sm font-semibold" style={{ color: tier.hex }}>
                      {tier.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ======== 2. TYPOGRAPHY ======== */}
        <section>
          <h2 className="text-2xl font-bold text-op-text mb-6">Typography</h2>
          <div className="bg-op-surface rounded-lg p-6 border border-op-border space-y-4">
            <TypographySample label="H1" className="text-3xl lg:text-4xl font-bold text-op-text" text="Page Heading" />
            <TypographySample label="H2" className="text-2xl lg:text-[28px] font-semibold text-op-text" text="Section Title" />
            <TypographySample label="H3" className="text-lg lg:text-[22px] font-semibold text-op-text" text="Card Title" />
            <TypographySample label="Body" className="text-[15px] lg:text-base text-op-text" text="Body text for reading. 본문 텍스트입니다." />
            <TypographySample label="Small" className="text-[13px] lg:text-sm text-op-text-secondary" text="Secondary information and labels" />
            <TypographySample label="Caption" className="text-[11px] text-op-text-muted" text="Timestamps, metadata" />
          </div>
        </section>

        {/* ======== 3. SPACING & RADIUS ======== */}
        <section>
          <h2 className="text-2xl font-bold text-op-text mb-6">Spacing & Border Radius</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Spacing scale */}
            <div className="bg-op-surface rounded-lg p-6 border border-op-border">
              <h3 className="text-sm font-semibold text-op-text-secondary mb-4 uppercase tracking-wider">
                Spacing Scale (4px base)
              </h3>
              <div className="space-y-2">
                {[
                  { label: '1 (4px)', w: '16px' },
                  { label: '2 (8px)', w: '32px' },
                  { label: '3 (12px)', w: '48px' },
                  { label: '4 (16px)', w: '64px' },
                  { label: '6 (24px)', w: '96px' },
                  { label: '8 (32px)', w: '128px' },
                ].map((s) => (
                  <div key={s.label} className="flex items-center gap-3">
                    <span className="text-xs text-op-text-muted w-20">{s.label}</span>
                    <div
                      className="h-3 bg-op-gold rounded-sm"
                      style={{ width: s.w }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Border radius */}
            <div className="bg-op-surface rounded-lg p-6 border border-op-border">
              <h3 className="text-sm font-semibold text-op-text-secondary mb-4 uppercase tracking-wider">
                Border Radius
              </h3>
              <div className="flex flex-wrap gap-4">
                {[
                  { label: 'sm (4px)', r: '4px' },
                  { label: 'default (6px)', r: '6px' },
                  { label: 'md (8px)', r: '8px' },
                  { label: 'lg (12px)', r: '12px' },
                  { label: 'xl (16px)', r: '16px' },
                  { label: 'pill', r: '9999px' },
                ].map((r) => (
                  <div key={r.label} className="flex flex-col items-center gap-2">
                    <div
                      className="w-16 h-16 bg-op-elevated border border-op-border"
                      style={{ borderRadius: r.r }}
                    />
                    <span className="text-xs text-op-text-muted">{r.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ======== 4. SHADOWS ======== */}
        <section>
          <h2 className="text-2xl font-bold text-op-text mb-6">Shadows & Glows</h2>
          <div className="bg-op-surface rounded-lg p-6 border border-op-border">
            <div className="flex flex-wrap gap-6">
              {[
                { label: 'Card', shadow: '0 2px 4px rgba(0,0,0,0.3)' },
                { label: 'Elevated', shadow: '0 4px 8px rgba(0,0,0,0.4)' },
                { label: 'Modal', shadow: '0 8px 24px rgba(0,0,0,0.6)' },
                { label: 'Gold Glow', shadow: '0 0 12px rgba(201,162,39,0.4)' },
                { label: 'Success Glow', shadow: '0 0 12px rgba(34,197,94,0.4)' },
                { label: 'Danger Glow', shadow: '0 0 12px rgba(239,68,68,0.4)' },
              ].map((s) => (
                <div key={s.label} className="flex flex-col items-center gap-2">
                  <div
                    className="w-20 h-20 bg-op-elevated rounded-lg"
                    style={{ boxShadow: s.shadow }}
                  />
                  <span className="text-xs text-op-text-muted">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ======== 5. BUTTONS ======== */}
        <section>
          <h2 className="text-2xl font-bold text-op-text mb-6">Buttons</h2>
          <div className="bg-op-surface rounded-lg p-6 border border-op-border space-y-6">
            <div>
              <h3 className="text-sm text-op-text-secondary mb-3">Primary (Gold)</h3>
              <div className="flex flex-wrap gap-3">
                <button className="px-6 py-2.5 bg-op-gold hover:bg-op-gold-hover text-op-text-inverse font-semibold rounded-md transition-colors">
                  Primary
                </button>
                <button className="px-6 py-2.5 bg-op-gold hover:bg-op-gold-hover text-op-text-inverse font-semibold rounded-md transition-colors opacity-50 cursor-not-allowed">
                  Disabled
                </button>
              </div>
            </div>
            <div>
              <h3 className="text-sm text-op-text-secondary mb-3">Secondary</h3>
              <div className="flex flex-wrap gap-3">
                <button className="px-6 py-2.5 bg-op-elevated hover:bg-op-border-medium text-op-text font-semibold rounded-md transition-colors">
                  Secondary
                </button>
                <button className="px-6 py-2.5 border border-op-border hover:border-op-gold text-op-text font-semibold rounded-md transition-colors">
                  Outline
                </button>
              </div>
            </div>
            <div>
              <h3 className="text-sm text-op-text-secondary mb-3">Poker Actions</h3>
              <div className="flex flex-wrap gap-3">
                <button className="px-6 py-2.5 bg-op-enter hover:bg-op-enter-hover text-white font-semibold rounded-md transition-colors">
                  Enter Table
                </button>
                <button className="px-6 py-2.5 bg-op-error hover:opacity-90 text-white font-semibold rounded-md transition-colors">
                  Danger
                </button>
              </div>
            </div>
            <div>
              <h3 className="text-sm text-op-text-secondary mb-3">Pill / Tag</h3>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-op-gold-dim text-op-gold text-xs font-medium rounded-full">
                  Gold Tag
                </span>
                <span className="px-3 py-1 bg-op-success-dim text-op-success text-xs font-medium rounded-full">
                  Success
                </span>
                <span className="px-3 py-1 bg-op-error-dim text-op-error text-xs font-medium rounded-full">
                  Error
                </span>
                <span className="px-3 py-1 bg-op-warning-dim text-op-warning text-xs font-medium rounded-full">
                  Warning
                </span>
                <span className="px-3 py-1 bg-op-info-dim text-op-info text-xs font-medium rounded-full">
                  Info
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ======== 6. FORM ELEMENTS ======== */}
        <section>
          <h2 className="text-2xl font-bold text-op-text mb-6">Form Elements</h2>
          <div className="bg-op-surface rounded-lg p-6 border border-op-border space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-op-text mb-2">Text Input</label>
              <input
                type="text"
                placeholder="Placeholder text..."
                className="w-full bg-op-deep border border-op-border rounded-md px-4 py-2 text-op-text placeholder:text-op-text-dim focus:border-op-gold focus:outline-none transition-colors"
                readOnly
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-op-text mb-2">Select</label>
              <select className="w-full bg-op-deep border border-op-border rounded-md px-4 py-2 text-op-text focus:border-op-gold focus:outline-none transition-colors">
                <option>Option 1</option>
                <option>Option 2</option>
              </select>
            </div>
          </div>
        </section>

        {/* ======== 7. CARDS ======== */}
        <section>
          <h2 className="text-2xl font-bold text-op-text mb-6">Card Patterns</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-op-surface border border-op-border rounded-lg p-5">
              <h3 className="text-sm font-semibold text-op-text mb-2">Standard Card</h3>
              <p className="text-xs text-op-text-secondary">bg-op-surface + border-op-border</p>
            </div>
            <div className="bg-op-surface border border-op-border rounded-lg p-5 hover:border-op-gold transition-colors cursor-pointer">
              <h3 className="text-sm font-semibold text-op-text mb-2">Interactive Card</h3>
              <p className="text-xs text-op-text-secondary">hover:border-op-gold</p>
            </div>
            <div className="bg-op-surface border border-op-border rounded-lg p-5" style={{ boxShadow: '0 0 12px rgba(201,162,39,0.4)' }}>
              <h3 className="text-sm font-semibold text-op-gold mb-2">Featured Card</h3>
              <p className="text-xs text-op-text-secondary">Gold glow shadow</p>
            </div>
          </div>
        </section>

        {/* ======== 8. PLAYING CARDS ======== */}
        <section>
          <h2 className="text-2xl font-bold text-op-text mb-6">Playing Cards</h2>
          <div className="bg-op-surface rounded-lg p-6 border border-op-border space-y-6">
            <div>
              <h3 className="text-sm text-op-text-secondary mb-3">Sizes</h3>
              <div className="flex items-end gap-4">
                <CardRenderer rank="A" suit="h" size="sm" />
                <CardRenderer rank="K" suit="d" size="md" />
                <CardRenderer rank="Q" suit="s" size="lg" />
              </div>
            </div>
            <div>
              <h3 className="text-sm text-op-text-secondary mb-3">Suits</h3>
              <div className="flex items-center gap-2">
                <CardRenderer rank="A" suit="h" size="md" />
                <CardRenderer rank="A" suit="d" size="md" />
                <CardRenderer rank="A" suit="s" size="md" />
                <CardRenderer rank="A" suit="c" size="md" />
              </div>
            </div>
            <div>
              <h3 className="text-sm text-op-text-secondary mb-3">Inline Cards</h3>
              <InlineCards notation="Ah Kd Qs Jc Ts" size="md" />
            </div>
            <div>
              <h3 className="text-sm text-op-text-secondary mb-3">Face Down</h3>
              <CardRenderer rank="A" suit="h" size="md" faceDown />
            </div>
          </div>
        </section>

        {/* ======== 9. POKER TABLE ======== */}
        <section>
          <h2 className="text-2xl font-bold text-op-text mb-6">Poker Table</h2>
          <div className="bg-op-surface rounded-lg p-6 border border-op-border">
            <TableVisualizer
              seats={[
                { position: 'BTN', stack: 500, isHero: true, isActive: true },
                { position: 'SB', stack: 300, isFolded: false },
                { position: 'BB', stack: 450, isActive: false },
                { position: 'UTG', stack: 600, isFolded: true },
                { position: 'MP', stack: 350 },
                { position: 'CO', stack: 550 },
              ]}
              communityCards="Ah Kd Qs 7c 2h"
              pot={150}
              maxSeats={6}
            />
          </div>
        </section>

        {/* ======== 10. STREET NAVIGATOR ======== */}
        <section>
          <h2 className="text-2xl font-bold text-op-text mb-6">Street Navigator</h2>
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
              {
                street: 'flop',
                actions: [
                  { position: 'BB', type: 'check' },
                  { position: 'BTN', type: 'bet', amount: 25 },
                  { position: 'BB', type: 'call', amount: 25 },
                ]
              },
            ]}
            sticky={false}
          />
        </section>

        {/* ======== 11. HAND CARDS ======== */}
        <section>
          <h2 className="text-2xl font-bold text-op-text mb-6">Hand Cards</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <HandCard
              handId="1"
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
              isLiked={false}
            />
            <HandCard
              handId="2"
              heroCards="7h 2c"
              boardCards="Ah Kd Qs Jc Ts"
              stakes="2/5"
              heroPosition="BB"
              result="lost"
              author={{ userId: 'u2', nickname: 'Newbie', level: 3 }}
              likes={12}
              comments={3}
              createdAt={new Date(Date.now() - 1000 * 60 * 60 * 2)}
            />
          </div>
        </section>

        {/* ======== 12. ATTENDANCE ======== */}
        <section>
          <h2 className="text-2xl font-bold text-op-text mb-6">Attendance Calendar</h2>
          <div className="max-w-md">
            <AttendanceCalendar
              year={today.getFullYear()}
              month={today.getMonth() + 1}
              days={sampleDays}
              currentStreak={7}
              isCheckedToday={false}
            />
          </div>
        </section>

        {/* ======== 13. MISSION CARDS ======== */}
        <section>
          <h2 className="text-2xl font-bold text-op-text mb-6">Mission Cards</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <MissionCard
              id="m1"
              title="첫 게시글 작성"
              description="게시판에 게시글 1개 작성하기"
              icon={MessageSquare}
              current={0}
              target={1}
              reward={100}
              status="active"
            />
            <MissionCard
              id="m2"
              title="핸드 공유하기"
              description="핸드 히스토리 3개 공유"
              icon={Heart}
              current={2}
              target={3}
              reward={150}
              status="active"
            />
            <MissionCard
              id="m3"
              title="랭킹 진입"
              description="주간 랭킹 TOP 100 진입"
              icon={Trophy}
              current={1}
              target={1}
              reward={500}
              status="completed"
            />
          </div>
        </section>

        {/* ======== 14. AUTHOR BADGES ======== */}
        <section>
          <h2 className="text-2xl font-bold text-op-text mb-6">Author Badges</h2>
          <div className="bg-op-surface rounded-lg p-6 border border-op-border space-y-4">
            <div className="flex flex-wrap gap-4">
              <AuthorBadge userId="u1" nickname="Bronze" level={5} />
              <AuthorBadge userId="u2" nickname="Silver" level={15} />
              <AuthorBadge userId="u3" nickname="Gold" level={30} />
              <AuthorBadge userId="u4" nickname="Platinum" level={60} />
              <AuthorBadge userId="u5" nickname="Diamond" level={100} />
            </div>
            <div className="flex flex-wrap gap-4">
              <AuthorBadge userId="u1" nickname="Compact" level={25} compact />
            </div>
          </div>
        </section>

        {/* ======== 15. POST ROWS ======== */}
        <section>
          <h2 className="text-2xl font-bold text-op-text mb-6">Post Rows</h2>
          <div className="bg-op-surface rounded-lg overflow-hidden divide-y divide-op-border">
            <PostRow
              postId="p1"
              boardSlug="general"
              title="첫 라이브 게임 후기 - 긴장했지만 재밌었어요!"
              author={{ userId: 'u1', nickname: 'PokerPro', level: 15 }}
              createdAt={new Date()}
              views={234}
              likes={42}
              commentCount={8}
              isPinned
            />
            <PostRow
              postId="p2"
              boardSlug="strategy"
              title="3-bet 레인지 질문입니다"
              author={{ userId: 'u2', nickname: 'Newbie', level: 3 }}
              createdAt={new Date(Date.now() - 1000 * 60 * 60 * 2)}
              views={89}
              likes={15}
              commentCount={5}
            />
          </div>
        </section>

        {/* ======== 16. LIKE BUTTON ======== */}
        <section>
          <h2 className="text-2xl font-bold text-op-text mb-6">Like Button</h2>
          <div className="bg-op-surface rounded-lg p-6 border border-op-border">
            <div className="flex items-center gap-8">
              <LikeButton
                targetId="demo"
                targetType="post"
                initialLikes={42}
                size="sm"
              />
              <LikeButton
                targetId="demo"
                targetType="post"
                initialLikes={1234}
                size="md"
              />
              <LikeButton
                targetId="demo"
                targetType="post"
                initialLikes={5678}
                initialIsLiked
                size="lg"
              />
            </div>
          </div>
        </section>

        {/* ======== 17. TOKEN USAGE GUIDE ======== */}
        <section className="border-t border-op-border pt-12">
          <h2 className="text-2xl font-bold text-op-text mb-6">Token Usage Guide</h2>
          <div className="bg-op-surface rounded-lg p-6 border border-op-border">
            <div className="space-y-6 text-sm">
              <div>
                <h3 className="font-semibold text-op-gold mb-2">Tailwind Classes (Recommended)</h3>
                <pre className="bg-op-deep rounded-md p-4 text-op-text-secondary overflow-x-auto">
{`<!-- Backgrounds -->
<div class="bg-op-bg">        <!-- #121212 page bg -->
<div class="bg-op-surface">   <!-- #1e1e1e card bg -->
<div class="bg-op-elevated">  <!-- #2a2a2a hover bg -->
<div class="bg-op-deep">      <!-- #0a0a0a deep bg -->

<!-- Text -->
<p class="text-op-text">          <!-- #e0e0e0 primary -->
<p class="text-op-text-secondary"> <!-- #a0a0a0 secondary -->
<p class="text-op-gold">          <!-- #c9a227 accent -->

<!-- Borders -->
<div class="border-op-border">  <!-- #333333 -->

<!-- Status -->
<span class="text-op-success">  <!-- #22c55e -->
<span class="bg-op-error-dim">  <!-- rgba(239,68,68,0.15) -->`}
                </pre>
              </div>
              <div>
                <h3 className="font-semibold text-op-gold mb-2">CSS Variables</h3>
                <pre className="bg-op-deep rounded-md p-4 text-op-text-secondary overflow-x-auto">
{`/* Use in custom CSS or inline styles */
.my-element {
  background: var(--color-op-surface);
  color: var(--color-op-text);
  border: 1px solid var(--color-op-border);
}

.my-button:hover {
  background: var(--color-op-gold-hover);
}`}
                </pre>
              </div>
              <div>
                <h3 className="font-semibold text-op-gold mb-2">TypeScript Import</h3>
                <pre className="bg-op-deep rounded-md p-4 text-op-text-secondary overflow-x-auto">
{`import { colors, shadows, animation } from '@/lib/design-tokens';

// Use in JS/TS when CSS isn't possible
const style = {
  background: colors.background.card,  // '#1e1e1e'
  boxShadow: shadows.glow.gold,       // '0 0 12px rgba(...)'
};`}
                </pre>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Bottom spacing for mobile nav */}
      <div className="h-24 lg:h-0" />
    </div>
  );
}
