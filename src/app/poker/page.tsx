import { getPokerTables } from './actions';
import { PokerLobbyClient } from './PokerLobbyClient';

export const dynamic = 'force-dynamic';

export default async function PokerLobbyPage() {
  const { tables, myTableId } = await getPokerTables();
  return <PokerLobbyClient tables={tables} myTableId={myTableId} />;
}
