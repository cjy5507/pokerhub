import type { Metadata } from 'next';
import { getPokerTables } from './actions';

export const metadata: Metadata = {
  title: '포커 테이블 | Open Poker',
  description: '오픈포커 라이브 포커 테이블 로비 — 지금 바로 참여하세요.',
};
import { PokerLobbyClient } from './PokerLobbyClient';

export const dynamic = 'force-dynamic';

export default async function PokerLobbyPage() {
  const { tables, myTableId } = await getPokerTables();
  return <PokerLobbyClient tables={tables} myTableId={myTableId} />;
}
