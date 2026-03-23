export interface RaceEvent {
  type: 'obstacle' | 'mushroom' | 'boost' | 'rain';
  targetSnailId?: number;
  timestamp: number;
  duration?: number;
}
