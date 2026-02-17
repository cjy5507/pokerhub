import { db } from '@/lib/db';
import { pointTransactions, users } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

export type PointTransactionType =
  | 'earn_post'
  | 'earn_comment'
  | 'earn_like'
  | 'earn_attendance'
  | 'earn_mission'
  | 'spend_badge'
  | 'spend_custom_title'
  | 'admin_adjust';

interface AwardPointsResult {
  success: boolean;
  newBalance: number;
  transactionId: string;
}

/**
 * Award points to a user atomically
 * @param userId - User ID
 * @param amount - Points to award (positive number)
 * @param type - Transaction type
 * @param referenceId - Optional reference ID (mission, post, etc.)
 * @param description - Optional description
 */
export async function awardPoints(
  userId: string,
  amount: number,
  type: PointTransactionType,
  referenceId?: string,
  description?: string
): Promise<AwardPointsResult> {
  if (!db) return { success: false, newBalance: 0, transactionId: '' };
  if (amount <= 0) {
    throw new Error('Award amount must be positive');
  }

  return await db.transaction(async (tx: any) => {
    // Update user points atomically
    const [updatedUser] = await tx
      .update(users)
      .set({
        points: sql`${users.points} + ${amount}`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning({ points: users.points });

    if (!updatedUser) {
      throw new Error('User not found');
    }

    // Record transaction
    const [transaction] = await tx
      .insert(pointTransactions)
      .values({
        userId,
        amount,
        balanceAfter: updatedUser.points,
        type,
        referenceId,
        description,
      })
      .returning({ id: pointTransactions.id });

    return {
      success: true,
      newBalance: updatedUser.points,
      transactionId: transaction.id,
    };
  });
}

/**
 * Spend points from a user atomically
 * @param userId - User ID
 * @param amount - Points to spend (positive number)
 * @param type - Transaction type
 * @param referenceId - Optional reference ID
 * @param description - Optional description
 */
export async function spendPoints(
  userId: string,
  amount: number,
  type: PointTransactionType,
  referenceId?: string,
  description?: string
): Promise<AwardPointsResult> {
  if (!db) return { success: false, newBalance: 0, transactionId: '' };
  if (amount <= 0) {
    throw new Error('Spend amount must be positive');
  }

  return await db.transaction(async (tx: any) => {
    // Get current balance
    const [user] = await tx
      .select({ points: users.points })
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      throw new Error('User not found');
    }

    if (user.points < amount) {
      throw new Error('Insufficient points');
    }

    // Update user points atomically
    const [updatedUser] = await tx
      .update(users)
      .set({
        points: sql`${users.points} - ${amount}`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning({ points: users.points });

    // Record transaction (negative amount)
    const [transaction] = await tx
      .insert(pointTransactions)
      .values({
        userId,
        amount: -amount,
        balanceAfter: updatedUser.points,
        type,
        referenceId,
        description,
      })
      .returning({ id: pointTransactions.id });

    return {
      success: true,
      newBalance: updatedUser.points,
      transactionId: transaction.id,
    };
  });
}

/**
 * Get paginated point transaction history for a user
 */
export async function getPointHistory(
  userId: string,
  page: number = 1,
  limit: number = 20
) {
  if (!db) return { transactions: [], pagination: { page, limit, total: 0, totalPages: 0 } };
  const offset = (page - 1) * limit;

  const transactions = await db
    .select()
    .from(pointTransactions)
    .where(eq(pointTransactions.userId, userId))
    .orderBy(desc(pointTransactions.createdAt))
    .limit(limit)
    .offset(offset);

  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(pointTransactions)
    .where(eq(pointTransactions.userId, userId));

  return {
    transactions,
    pagination: {
      page,
      limit,
      total: countResult?.count || 0,
      totalPages: Math.ceil((countResult?.count || 0) / limit),
    },
  };
}

/**
 * Get current point balance for a user
 */
export async function getPointBalance(userId: string): Promise<number> {
  if (!db) return 0;
  const [user] = await db
    .select({ points: users.points })
    .from(users)
    .where(eq(users.id, userId));

  return user?.points || 0;
}
