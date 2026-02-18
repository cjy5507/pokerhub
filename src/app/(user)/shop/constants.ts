// Shop constants — no 'use server', safe to import from both server and client

export const BADGE_PRICES: Record<string, number> = {
  common: 100,
  rare: 500,
  epic: 2000,
  legendary: 5000,
};

export const TITLE_PRICES: Record<string, number> = {
  '포커 마스터': 1000,
  '전략가': 800,
  '올인 매니아': 500,
  '블러퍼': 500,
  '타이트 플레이어': 500,
  custom: 2000,
};

export const CHIP_PACKAGES = [
  { id: 'chips_1000', label: '1,000 칩', chips: 1000, price: 500 },
  { id: 'chips_5000', label: '5,000 칩', chips: 5000, price: 2000 },
  { id: 'chips_10000', label: '10,000 칩', chips: 10000, price: 3500 },
  { id: 'chips_50000', label: '50,000 칩', chips: 50000, price: 15000 },
];

export const AVATAR_FRAMES = [
  { id: 'frame_gold', label: '골드 프레임', icon: '🥇', price: 3000 },
  { id: 'frame_diamond', label: '다이아몬드 프레임', icon: '💎', price: 5000 },
  { id: 'frame_fire', label: '파이어 프레임', icon: '🔥', price: 2000 },
  { id: 'frame_rainbow', label: '레인보우 프레임', icon: '🌈', price: 4000 },
];

export const EMOJI_PACKS = [
  { id: 'emoji_poker', label: '포커 이모지 팩', icon: '🃏', price: 1000, description: '카드, 칩, 포커 관련 특수 이모지 20종' },
  { id: 'emoji_celebrate', label: '축하 이모지 팩', icon: '🎉', price: 800, description: '당첨, 축하, 승리 이모지 15종' },
  { id: 'emoji_tilt', label: '틸트 이모지 팩', icon: '😤', price: 600, description: '감정 표현 이모지 12종' },
];

export const PRESET_TITLES = [
  { id: 'title_poker_master', label: '포커 마스터', price: 1000 },
  { id: 'title_strategist', label: '전략가', price: 800 },
  { id: 'title_allin', label: '올인 매니아', price: 500 },
  { id: 'title_bluffer', label: '블러퍼', price: 500 },
  { id: 'title_tight', label: '타이트 플레이어', price: 500 },
];
