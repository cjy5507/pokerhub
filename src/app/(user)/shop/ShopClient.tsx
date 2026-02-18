'use client';

import { useState, useCallback } from 'react';
import { Loader2, ShoppingBag, Award, Type, Cpu, Smile, X, Check } from 'lucide-react';
import type { BadgeShopItem } from './actions';
import {
  purchaseBadge,
  purchaseTitle,
  purchaseChips,
  purchaseAvatarFrame,
  purchaseEmojiPack,
} from './actions';
import {
  CHIP_PACKAGES,
  AVATAR_FRAMES,
  EMOJI_PACKS,
  PRESET_TITLES,
} from './constants';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Category = 'all' | 'badges' | 'titles' | 'avatar' | 'chips' | 'emojis';

interface Props {
  initialBadges: BadgeShopItem[];
  initialPoints: number;
  initialTitle: string | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORY_TABS: { id: Category; label: string; icon: string }[] = [
  { id: 'all', label: '전체', icon: '🏪' },
  { id: 'badges', label: '뱃지', icon: '🏅' },
  { id: 'titles', label: '칭호', icon: '👑' },
  { id: 'avatar', label: '아바타 꾸미기', icon: '🖼️' },
  { id: 'chips', label: '게임칩', icon: '🎰' },
  { id: 'emojis', label: '이모지', icon: '😄' },
];

const RARITY_STYLES: Record<string, { border: string; text: string; badge: string }> = {
  common: {
    border: 'border-op-border',
    text: 'text-op-text-muted',
    badge: 'bg-op-elevated text-op-text-muted border-op-border',
  },
  rare: {
    border: 'border-blue-500/40',
    text: 'text-blue-400',
    badge: 'bg-blue-900/20 text-blue-400 border-blue-500/40',
  },
  epic: {
    border: 'border-purple-500/40',
    text: 'text-purple-400',
    badge: 'bg-purple-900/20 text-purple-400 border-purple-500/40',
  },
  legendary: {
    border: 'border-op-gold/50',
    text: 'text-op-gold',
    badge: 'bg-op-gold/10 text-op-gold border-op-gold/40',
  },
};

const RARITY_LABELS: Record<string, string> = {
  common: '일반',
  rare: '레어',
  epic: '에픽',
  legendary: '전설',
};

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------

interface ToastItem {
  id: number;
  type: 'success' | 'error';
  text: string;
}

// ---------------------------------------------------------------------------
// ConfirmModal
// ---------------------------------------------------------------------------

interface ConfirmModalProps {
  title: string;
  description: string;
  price: number;
  userPoints: number;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: React.ReactNode;
}

function ConfirmModal({
  title,
  description,
  price,
  userPoints,
  loading,
  onConfirm,
  onCancel,
  children,
}: ConfirmModalProps) {
  const canAfford = userPoints >= price;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} />
      <div className="relative bg-op-surface border border-op-border rounded-xl w-full max-w-md p-6 shadow-2xl">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-op-text-muted hover:text-op-text transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-bold mb-2">{title}</h3>
        <p className="text-op-text-secondary text-sm mb-4">{description}</p>

        {children}

        <div className="bg-op-bg rounded-lg p-4 mb-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-op-text-secondary">구매 가격</span>
            <span className="text-op-gold font-bold">{price.toLocaleString()}P</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-op-text-secondary">보유 포인트</span>
            <span className={canAfford ? 'text-op-text' : 'text-red-400'}>{userPoints.toLocaleString()}P</span>
          </div>
          <div className="border-t border-op-border pt-2 flex justify-between text-sm font-medium">
            <span className="text-op-text-secondary">구매 후 잔액</span>
            <span className={canAfford ? 'text-op-gold' : 'text-red-400'}>
              {canAfford ? (userPoints - price).toLocaleString() : '포인트 부족'}P
            </span>
          </div>
        </div>

        {!canAfford && (
          <p className="text-red-400 text-sm mb-4 text-center">포인트가 부족합니다</p>
        )}

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-lg border border-op-border text-op-text-secondary hover:bg-op-elevated transition-colors"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            disabled={!canAfford || loading}
            className="flex-1 py-2.5 rounded-lg bg-op-gold hover:bg-op-gold-hover disabled:bg-op-elevated disabled:text-op-text-muted text-op-text-inverse font-medium transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> 처리 중...</>
            ) : (
              '구매하기'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ProductCard
// ---------------------------------------------------------------------------

interface ProductCardProps {
  icon: React.ReactNode;
  name: string;
  description?: string | null;
  price: number;
  owned?: boolean;
  badge?: React.ReactNode;
  onBuy: () => void;
  disabled?: boolean;
  userPoints: number;
}

function ProductCard({ icon, name, description, price, owned, badge, onBuy, disabled, userPoints }: ProductCardProps) {
  const canAfford = userPoints >= price;

  return (
    <div className="bg-op-surface border border-op-border rounded-lg p-4 flex flex-col gap-3 hover:border-op-border/80 transition-colors">
      <div className="flex items-start gap-3">
        <div className="w-14 h-14 rounded-lg bg-op-elevated flex items-center justify-center text-2xl flex-shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-op-text truncate">{name}</span>
            {badge}
          </div>
          {description && (
            <p className="text-sm text-op-text-secondary mt-1 line-clamp-2">{description}</p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mt-auto pt-1">
        <span className="text-op-gold font-bold text-sm">{price.toLocaleString()}P</span>
        {owned ? (
          <span className="flex items-center gap-1 text-green-400 text-sm font-medium px-3 py-1 bg-green-900/20 rounded-lg">
            <Check className="w-3.5 h-3.5" />
            보유 중
          </span>
        ) : (
          <button
            onClick={onBuy}
            disabled={disabled}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              canAfford && !disabled
                ? 'bg-op-gold hover:bg-op-gold-hover text-op-text-inverse'
                : 'bg-op-elevated text-op-text-muted cursor-not-allowed'
            }`}
          >
            구매하기
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ShopClient
// ---------------------------------------------------------------------------

export default function ShopClient({ initialBadges, initialPoints, initialTitle }: Props) {
  const [activeCategory, setActiveCategory] = useState<Category>('all');
  const [points, setPoints] = useState(initialPoints);
  const [customTitle, setCustomTitle] = useState(initialTitle);
  const [badges, setBadges] = useState(initialBadges);
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Modal state
  const [modal, setModal] = useState<{
    type: 'badge' | 'title' | 'chips' | 'avatar' | 'emoji';
    id: string;
    name: string;
    description: string;
    price: number;
    isCustomTitle?: boolean;
  } | null>(null);
  const [customTitleInput, setCustomTitleInput] = useState('');

  // ---------------------------------------------------------------------------
  // Toast helpers
  // ---------------------------------------------------------------------------

  const addToast = useCallback((type: 'success' | 'error', text: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, text }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  // ---------------------------------------------------------------------------
  // Purchase handlers
  // ---------------------------------------------------------------------------

  async function handleConfirm() {
    if (!modal) return;
    setLoading(true);

    try {
      let result: { success: boolean; newBalance?: number; error?: string };

      if (modal.type === 'badge') {
        result = await purchaseBadge(modal.id);
        if (result.success) {
          setBadges((prev) =>
            prev.map((b) => (b.id === modal.id ? { ...b, owned: true } : b))
          );
        }
      } else if (modal.type === 'title') {
        const titleText = modal.isCustomTitle ? customTitleInput.trim() : modal.name;
        if (modal.isCustomTitle && (titleText.length < 2 || titleText.length > 20)) {
          addToast('error', '칭호는 2~20자여야 합니다');
          setLoading(false);
          return;
        }
        result = await purchaseTitle(titleText, modal.isCustomTitle ?? false);
        if (result.success && modal.isCustomTitle) {
          setCustomTitle(titleText);
        } else if (result.success) {
          setCustomTitle(modal.name);
        }
      } else if (modal.type === 'chips') {
        result = await purchaseChips(modal.id);
      } else if (modal.type === 'avatar') {
        result = await purchaseAvatarFrame(modal.id);
      } else {
        result = await purchaseEmojiPack(modal.id);
      }

      if (result.success) {
        if (result.newBalance !== undefined) setPoints(result.newBalance);
        addToast('success', `${modal.name} 구매 완료!`);
        setModal(null);
        setCustomTitleInput('');
      } else {
        addToast('error', result.error ?? '구매에 실패했습니다');
      }
    } catch {
      addToast('error', '오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  }

  function openModal(
    type: 'badge' | 'title' | 'chips' | 'avatar' | 'emoji',
    id: string,
    name: string,
    description: string,
    price: number,
    isCustomTitle?: boolean
  ) {
    setModal({ type, id, name, description, price, isCustomTitle });
  }

  // ---------------------------------------------------------------------------
  // Filtered section visibility
  // ---------------------------------------------------------------------------

  const show = (cat: Category) => activeCategory === 'all' || activeCategory === cat;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-op-bg text-op-text">
      {/* Toast container */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all ${
              t.type === 'success'
                ? 'bg-green-900 border border-green-600 text-green-100'
                : 'bg-red-900 border border-red-600 text-red-100'
            }`}
          >
            {t.type === 'success' ? <Check className="w-4 h-4 flex-shrink-0" /> : <X className="w-4 h-4 flex-shrink-0" />}
            {t.text}
          </div>
        ))}
      </div>

      {/* Confirm Modal */}
      {modal && (
        <ConfirmModal
          title={modal.isCustomTitle ? '커스텀 칭호 구매' : `${modal.name} 구매`}
          description={modal.description}
          price={modal.isCustomTitle ? modal.price : modal.price}
          userPoints={points}
          loading={loading}
          onConfirm={handleConfirm}
          onCancel={() => { setModal(null); setCustomTitleInput(''); }}
        >
          {modal.isCustomTitle && (
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 text-op-text-secondary">
                원하는 칭호 입력 ({customTitleInput.length}/20)
              </label>
              <input
                type="text"
                value={customTitleInput}
                onChange={(e) => setCustomTitleInput(e.target.value.slice(0, 20))}
                placeholder="칭호를 입력하세요 (2~20자)"
                className="w-full bg-op-bg border border-op-border rounded-lg px-4 py-2.5 text-op-text focus:border-op-gold outline-none"
              />
            </div>
          )}
        </ConfirmModal>
      )}

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <ShoppingBag className="w-8 h-8 text-op-gold" />
            <h1 className="text-3xl font-bold">포인트 샵</h1>
          </div>
          <div className="flex items-center gap-2 bg-op-surface border border-op-gold/30 rounded-xl px-5 py-3">
            <span className="text-op-text-secondary text-sm">보유 포인트</span>
            <span className="text-2xl font-bold text-op-gold">
              {points.toLocaleString()}P
            </span>
          </div>
        </div>

        {/* Current Title Banner */}
        {customTitle && (
          <div className="mb-6 bg-op-surface border border-op-gold/20 rounded-lg px-5 py-3 flex items-center gap-3">
            <span className="text-op-text-secondary text-sm">현재 칭호:</span>
            <span className="text-op-gold font-bold">{customTitle}</span>
          </div>
        )}

        {/* Category Tabs */}
        <div className="flex gap-1 mb-8 overflow-x-auto pb-1 border-b border-op-border">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                activeCategory === tab.id
                  ? 'text-op-gold border-b-2 border-op-gold -mb-px'
                  : 'text-op-text-secondary hover:text-op-text'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="space-y-10">
          {/* ---------------------------------------------------------------- */}
          {/* BADGES */}
          {/* ---------------------------------------------------------------- */}
          {show('badges') && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Award className="w-5 h-5 text-op-gold" />
                <h2 className="text-xl font-bold">뱃지</h2>
                <span className="text-op-text-muted text-sm">({badges.length}종)</span>
              </div>
              {badges.length === 0 ? (
                <div className="text-center py-12 text-op-text-secondary bg-op-surface border border-op-border rounded-lg">
                  현재 구매 가능한 뱃지가 없습니다
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {badges.map((badge) => {
                    const style = RARITY_STYLES[badge.rarity] ?? RARITY_STYLES.common;
                    return (
                      <ProductCard
                        key={badge.id}
                        icon={
                          <img
                            src={badge.iconUrl}
                            alt={badge.nameKo}
                            className="w-10 h-10 object-cover"
                            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                          />
                        }
                        name={badge.nameKo}
                        description={badge.descriptionKo}
                        price={badge.price}
                        owned={badge.owned}
                        badge={
                          <span className={`text-xs px-1.5 py-0.5 rounded border ${style.badge}`}>
                            {RARITY_LABELS[badge.rarity] ?? badge.rarity}
                          </span>
                        }
                        userPoints={points}
                        onBuy={() =>
                          openModal('badge', badge.id, badge.nameKo, badge.descriptionKo ?? '', badge.price)
                        }
                      />
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* TITLES */}
          {/* ---------------------------------------------------------------- */}
          {show('titles') && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Type className="w-5 h-5 text-op-gold" />
                <h2 className="text-xl font-bold">칭호</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {PRESET_TITLES.map((t) => (
                  <ProductCard
                    key={t.id}
                    icon={<span className="text-2xl">👑</span>}
                    name={t.label}
                    description="프로필에 표시되는 칭호"
                    price={t.price}
                    owned={customTitle === t.label}
                    userPoints={points}
                    onBuy={() =>
                      openModal('title', t.id, t.label, '프로필에 표시되는 칭호입니다', t.price, false)
                    }
                  />
                ))}
                {/* Custom title card */}
                <ProductCard
                  icon={<span className="text-2xl">✏️</span>}
                  name="커스텀 칭호"
                  description="원하는 텍스트로 나만의 칭호를 만드세요 (2~20자)"
                  price={2000}
                  userPoints={points}
                  onBuy={() =>
                    openModal('title', 'custom', '커스텀 칭호', '원하는 텍스트로 나만의 칭호를 만드세요', 2000, true)
                  }
                />
              </div>
            </section>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* AVATAR */}
          {/* ---------------------------------------------------------------- */}
          {show('avatar') && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-op-gold text-lg">🖼️</span>
                <h2 className="text-xl font-bold">아바타 꾸미기</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {AVATAR_FRAMES.map((frame) => (
                  <ProductCard
                    key={frame.id}
                    icon={<span className="text-3xl">{frame.icon}</span>}
                    name={frame.label}
                    description="프로필 아바타에 표시되는 특수 프레임"
                    price={frame.price}
                    userPoints={points}
                    onBuy={() =>
                      openModal('avatar', frame.id, frame.label, '프로필 아바타에 표시되는 특수 프레임입니다', frame.price)
                    }
                  />
                ))}
              </div>
            </section>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* CHIPS */}
          {/* ---------------------------------------------------------------- */}
          {show('chips') && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Cpu className="w-5 h-5 text-op-gold" />
                <h2 className="text-xl font-bold">게임칩</h2>
              </div>
              <p className="text-sm text-op-text-secondary mb-4">
                포인트를 포커 게임 칩으로 전환합니다. 구매한 칩은 포인트 포커 테이블에서 사용됩니다.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {CHIP_PACKAGES.map((pkg) => (
                  <ProductCard
                    key={pkg.id}
                    icon={<span className="text-3xl">🎰</span>}
                    name={pkg.label}
                    description={`${pkg.chips.toLocaleString()} 게임 칩`}
                    price={pkg.price}
                    userPoints={points}
                    onBuy={() =>
                      openModal(
                        'chips',
                        pkg.id,
                        pkg.label,
                        `${pkg.chips.toLocaleString()}개의 게임 칩을 충전합니다`,
                        pkg.price
                      )
                    }
                  />
                ))}
              </div>
            </section>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* EMOJIS */}
          {/* ---------------------------------------------------------------- */}
          {show('emojis') && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Smile className="w-5 h-5 text-op-gold" />
                <h2 className="text-xl font-bold">이모지 팩</h2>
              </div>
              <p className="text-sm text-op-text-secondary mb-4">
                채팅과 게임에서 사용할 수 있는 특수 이모지 팩입니다.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {EMOJI_PACKS.map((pack) => (
                  <ProductCard
                    key={pack.id}
                    icon={<span className="text-3xl">{pack.icon}</span>}
                    name={pack.label}
                    description={pack.description}
                    price={pack.price}
                    userPoints={points}
                    onBuy={() =>
                      openModal('emoji', pack.id, pack.label, pack.description, pack.price)
                    }
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
