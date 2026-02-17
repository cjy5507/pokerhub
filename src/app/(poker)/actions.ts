'use server';

import { db } from '@/lib/db';
import { pokerHands, pokerHandPlayers, pokerHandActions, pokerHandComments, users } from '@/lib/db/schema';
import { getSession } from '@/lib/auth/session';
import { PokerHand, Card, Position, Street, ActionType, GameType, HandResult } from '@/types/poker';
import { eq, desc, and, sql } from 'drizzle-orm';

// Helper functions for type mapping
function mapGameTypeToDb(gameType: GameType): 'nlhe' | 'plo' | 'plo5' | 'mixed' {
  // Map frontend GameType to DB enum
  // For now, default 'cash' to 'nlhe' and 'tournament' to 'nlhe' as well
  // This mapping should be refined based on actual UI requirements
  return 'nlhe';
}

function mapGameTypeFromDb(dbGameType: 'nlhe' | 'plo' | 'plo5' | 'mixed'): GameType {
  // Map DB enum to frontend GameType
  // For now, all DB game types map to 'cash'
  return 'cash';
}

function mapPositionToDb(position: Position): string {
  return position.toLowerCase().replace('+', '');
}

function mapPositionFromDb(dbPosition: string): Position {
  const upperPosition = dbPosition.toUpperCase();
  if (upperPosition === 'UTG1') return 'UTG+1';
  if (upperPosition === 'UTG2') return 'UTG+2';
  if (upperPosition === 'MP1') return 'MP';
  if (upperPosition === 'MP2') return 'MP';
  return upperPosition as Position;
}

function mapResultToDb(result: HandResult): 'win' | 'loss' | 'tie' {
  if (result === 'won') return 'win';
  if (result === 'lost') return 'loss';
  if (result === 'split') return 'tie';
  return 'win';
}

function mapResultFromDb(dbResult: 'win' | 'loss' | 'tie'): HandResult {
  if (dbResult === 'win') return 'won';
  if (dbResult === 'loss') return 'lost';
  if (dbResult === 'tie') return 'split';
  return 'won';
}

function mapActionToDb(action: ActionType): string {
  return action === 'all-in' ? 'all_in' : action;
}

function mapActionFromDb(dbAction: string): ActionType {
  return dbAction === 'all_in' ? 'all-in' : dbAction as ActionType;
}

function cardsToString(cards: Card[]): string {
  return cards.join(' ');
}

function stringToCards(cardString: string | null): Card[] | undefined {
  if (!cardString) return undefined;
  return cardString.split(' ') as Card[];
}

export async function createHand(formData: FormData) {
  if (!db) return { success: false, error: 'Database not available' };
  const session = await getSession();
  if (!session?.userId) {
    throw new Error('Unauthorized');
  }

  // Parse FormData
  const gameType = formData.get('gameType') as string;
  const tableSize = formData.get('tableSize') as '6max' | '9max';
  const stakes = formData.get('stakes') as string;
  const heroPosition = formData.get('heroPosition') as Position;
  const heroCardsStr = formData.get('heroCards') as string;
  const boardFlopStr = formData.get('boardFlop') as string | null;
  const boardTurnStr = formData.get('boardTurn') as string | null;
  const boardRiverStr = formData.get('boardRiver') as string | null;
  const potPreflop = formData.get('potPreflop') ? parseInt(formData.get('potPreflop') as string) : null;
  const potFlop = formData.get('potFlop') ? parseInt(formData.get('potFlop') as string) : null;
  const potTurn = formData.get('potTurn') ? parseInt(formData.get('potTurn') as string) : null;
  const potRiver = formData.get('potRiver') ? parseInt(formData.get('potRiver') as string) : null;
  const result = formData.get('result') as HandResult;
  const analysisNotes = formData.get('analysisNotes') as string | null;
  const rawText = formData.get('rawText') as string | null;
  const playersJson = formData.get('players') as string;
  const actionsJson = formData.get('actions') as string;

  const players = JSON.parse(playersJson);
  const actions = JSON.parse(actionsJson);

  const handId = await db.transaction(async (tx: any) => {
    // Insert poker hand
    const [hand] = await tx.insert(pokerHands).values({
      authorId: session.userId,
      gameType: mapGameTypeToDb(gameType as GameType),
      tableSize,
      stakes,
      heroPosition: mapPositionToDb(heroPosition) as any,
      heroCards: heroCardsStr,
      boardFlop: boardFlopStr,
      boardTurn: boardTurnStr,
      boardRiver: boardRiverStr,
      potPreflop,
      potFlop,
      potTurn,
      potRiver,
      result: mapResultToDb(result),
      analysisNotes,
      rawText,
    }).returning({ id: pokerHands.id });

    // Insert players
    if (players && players.length > 0) {
      await tx.insert(pokerHandPlayers).values(
        players.map((player: any) => ({
          handId: hand.id,
          position: mapPositionToDb(player.position) as any,
          stackSize: player.stackSize,
          cards: player.cards ? cardsToString(player.cards) : null,
          isHero: player.isHero,
        }))
      );
    }

    // Insert actions
    if (actions && actions.length > 0) {
      await tx.insert(pokerHandActions).values(
        actions.map((action: any) => ({
          handId: hand.id,
          street: action.street as Street,
          sequence: action.sequence,
          position: mapPositionToDb(action.position) as any,
          action: mapActionToDb(action.action) as any,
          amount: action.amount,
        }))
      );
    }

    return hand.id;
  });

  return { success: true, handId };
}

export async function getHand(handId: string): Promise<PokerHand | null> {
  if (!db) return null;
  const result = await db
    .select({
      hand: pokerHands,
      author: users,
    })
    .from(pokerHands)
    .leftJoin(users, eq(pokerHands.authorId, users.id))
    .where(eq(pokerHands.id, handId))
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  const { hand, author } = result[0];

  // Fetch players
  const players = await db
    .select()
    .from(pokerHandPlayers)
    .where(eq(pokerHandPlayers.handId, handId));

  // Fetch actions
  const actions = await db
    .select()
    .from(pokerHandActions)
    .where(eq(pokerHandActions.handId, handId))
    .orderBy(pokerHandActions.street, pokerHandActions.sequence);

  // Map to PokerHand type
  return {
    id: hand.id,
    authorId: hand.authorId,
    authorNickname: author?.nickname,
    authorLevel: author?.level,
    gameType: mapGameTypeFromDb(hand.gameType),
    tableSize: hand.tableSize as '6max' | '9max',
    stakes: hand.stakes,
    heroPosition: mapPositionFromDb(hand.heroPosition),
    heroCards: stringToCards(hand.heroCards)!,
    boardFlop: stringToCards(hand.boardFlop),
    boardTurn: hand.boardTurn as Card | undefined,
    boardRiver: hand.boardRiver as Card | undefined,
    potPreflop: hand.potPreflop ?? undefined,
    potFlop: hand.potFlop ?? undefined,
    potTurn: hand.potTurn ?? undefined,
    potRiver: hand.potRiver ?? undefined,
    result: mapResultFromDb(hand.result),
    analysisNotes: hand.analysisNotes ?? undefined,
    players: players.map((p: any) => ({
      position: mapPositionFromDb(p.position),
      stackSize: p.stackSize,
      cards: stringToCards(p.cards),
      isHero: p.isHero,
    })),
    actions: actions.map((a: any) => ({
      street: a.street as Street,
      sequence: a.sequence,
      position: mapPositionFromDb(a.position),
      action: mapActionFromDb(a.action),
      amount: a.amount ?? undefined,
    })),
    likeCount: hand.likeCount,
    commentCount: hand.commentCount,
    viewCount: hand.viewCount,
    createdAt: hand.createdAt.toISOString(),
  };
}

export async function getHands(filters?: {
  position?: string;
  gameType?: string;
  result?: string;
  tag?: string;
  limit?: number;
  offset?: number;
}): Promise<PokerHand[]> {
  if (!db) return [];
  const limit = filters?.limit ?? 50;
  const offset = filters?.offset ?? 0;

  const conditions = [];
  if (filters?.position) {
    conditions.push(eq(pokerHands.heroPosition, mapPositionToDb(filters.position as Position) as any));
  }
  if (filters?.result) {
    conditions.push(eq(pokerHands.result, mapResultToDb(filters.result as HandResult)));
  }

  const results = await db
    .select({
      hand: pokerHands,
      author: users,
    })
    .from(pokerHands)
    .leftJoin(users, eq(pokerHands.authorId, users.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(pokerHands.createdAt))
    .limit(limit)
    .offset(offset);

  return Promise.all(
    results.map(async ({ hand, author }: any) => {
      const players = await db
        .select()
        .from(pokerHandPlayers)
        .where(eq(pokerHandPlayers.handId, hand.id));

      const actions = await db
        .select()
        .from(pokerHandActions)
        .where(eq(pokerHandActions.handId, hand.id))
        .orderBy(pokerHandActions.street, pokerHandActions.sequence);

      return {
        id: hand.id,
        authorId: hand.authorId,
        authorNickname: author?.nickname,
        authorLevel: author?.level,
        gameType: mapGameTypeFromDb(hand.gameType),
        tableSize: hand.tableSize as '6max' | '9max',
        stakes: hand.stakes,
        heroPosition: mapPositionFromDb(hand.heroPosition),
        heroCards: stringToCards(hand.heroCards)!,
        boardFlop: stringToCards(hand.boardFlop),
        boardTurn: hand.boardTurn as Card | undefined,
        boardRiver: hand.boardRiver as Card | undefined,
        potPreflop: hand.potPreflop ?? undefined,
        potFlop: hand.potFlop ?? undefined,
        potTurn: hand.potTurn ?? undefined,
        potRiver: hand.potRiver ?? undefined,
        result: mapResultFromDb(hand.result),
        analysisNotes: hand.analysisNotes ?? undefined,
        players: players.map((p: any) => ({
          position: mapPositionFromDb(p.position),
          stackSize: p.stackSize,
          cards: stringToCards(p.cards),
          isHero: p.isHero,
        })),
        actions: actions.map((a: any) => ({
          street: a.street as Street,
          sequence: a.sequence,
          position: mapPositionFromDb(a.position),
          action: mapActionFromDb(a.action),
          amount: a.amount ?? undefined,
        })),
        likeCount: hand.likeCount,
        commentCount: hand.commentCount,
        viewCount: hand.viewCount,
        createdAt: hand.createdAt.toISOString(),
      };
    })
  );
}

export async function createHandComment(handId: string, street: string, content: string) {
  if (!db) return { success: false, error: 'Database not available' };
  const session = await getSession();
  if (!session?.userId) {
    throw new Error('Unauthorized');
  }

  const [comment] = await db.insert(pokerHandComments).values({
    handId,
    authorId: session.userId,
    street: street as Street,
    content,
  }).returning({ id: pokerHandComments.id });

  // Update comment count
  await db
    .update(pokerHands)
    .set({ commentCount: sql`${pokerHands.commentCount} + 1` })
    .where(eq(pokerHands.id, handId));

  return { success: true, commentId: comment.id };
}

export async function likeHand(handId: string) {
  if (!db) return { success: false, error: 'Database not available' };
  const session = await getSession();
  if (!session?.userId) {
    throw new Error('Unauthorized');
  }

  // Update like count
  await db
    .update(pokerHands)
    .set({ likeCount: sql`${pokerHands.likeCount} + 1` })
    .where(eq(pokerHands.id, handId));

  return { success: true, liked: true };
}
