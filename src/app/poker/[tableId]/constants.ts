export const ACTION_LABELS_KR: Record<string, string> = {
  fold: '폴드',
  check: '체크',
  call: '콜',
  bet: '벳',
  raise: '레이즈',
  all_in: '올인',
  post_sb: 'SB',
  post_bb: 'BB',
};

export const SEAT_POSITIONS_2: [number, number][] = [
  [88, 50],
  [8, 50],
];

export const SEAT_POSITIONS_6: [number, number][] = [
  [92, 50],
  [67, 10],
  [15, 15],
  [8, 50],
  [15, 85],
  [67, 90],
];

export const SEAT_POSITIONS_9: [number, number][] = [
  [92, 50],
  [80, 22],
  [55, 8],
  [27, 14],
  [10, 35],
  [10, 65],
  [27, 86],
  [55, 92],
  [80, 78],
];

export const BET_POSITIONS_2: [number, number][] = [
  [65, 50],
  [30, 50],
];

export const BET_POSITIONS_6: [number, number][] = [
  [75, 50],
  [58, 25],
  [30, 28],
  [24, 50],
  [30, 72],
  [58, 75],
];

export const BET_POSITIONS_9: [number, number][] = [
  [75, 50],
  [68, 32],
  [53, 24],
  [36, 27],
  [25, 40],
  [25, 60],
  [36, 73],
  [53, 76],
  [68, 68],
];

export const BET_PRESETS_CONFIG = [
  { label: '1/3', getValue: (p: number) => Math.floor(p / 3) },
  { label: '1/2', getValue: (p: number) => Math.floor(p / 2) },
  { label: '2/3', getValue: (p: number) => Math.floor(p * 2 / 3) },
  { label: '팟', getValue: (p: number) => p },
  { label: '올인', getValue: (_p: number, stack: number) => stack },
] as const;

export const COMMUNITY_CARD_SLOTS = 5;
