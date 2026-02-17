export function formatAction(
  nickname: string,
  action: string,
  amount?: number,
  street?: string
): string {
  switch (action) {
    case 'fold':
      return `${nickname}님이 폴드했습니다`;
    case 'check':
      return `${nickname}님이 체크했습니다`;
    case 'call':
      return `${nickname}님이 콜했습니다 (${amount?.toLocaleString()})`;
    case 'bet':
      return `${nickname}님이 ${amount?.toLocaleString()} 벳했습니다`;
    case 'raise':
      return `${nickname}님이 ${amount?.toLocaleString()}으로 레이즈했습니다`;
    case 'all_in':
      return `${nickname}님이 올인했습니다! (${amount?.toLocaleString()})`;
    case 'post_sb':
      return `${nickname}님이 SB ${amount?.toLocaleString()} 포스트`;
    case 'post_bb':
      return `${nickname}님이 BB ${amount?.toLocaleString()} 포스트`;
    default:
      return `${nickname}: ${action}`;
  }
}

export function formatStreet(street: string): string {
  switch (street) {
    case 'preflop':
      return '--- 프리플랍 ---';
    case 'flop':
      return '--- 플랍 ---';
    case 'turn':
      return '--- 턴 ---';
    case 'river':
      return '--- 리버 ---';
    case 'showdown':
      return '--- 쇼다운 ---';
    default:
      return `--- ${street} ---`;
  }
}

export function formatResult(
  nickname: string,
  amount: number,
  handRank?: string
): string {
  if (amount > 0) {
    return `${nickname}님이 ${amount.toLocaleString()}P 획득 ${handRank ? `(${handRank})` : ''}`;
  }
  return `${nickname}님이 ${Math.abs(amount).toLocaleString()}P 잃음`;
}
