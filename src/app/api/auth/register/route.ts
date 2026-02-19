import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { users, pointTransactions, userSettings } from '@/lib/db/schema';
import { hashPassword } from '@/lib/auth/password';
import { createSession } from '@/lib/auth/session';
import { eq } from 'drizzle-orm';

// --- In-memory rate limiter: 5 registrations per IP per 15 minutes ---
interface RateLimitEntry {
  count: number;
  resetAt: number;
}
const rateLimitMap = new Map<string, RateLimitEntry>();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }

  entry.count += 1;
  return true;
}

const registerSchema = z.object({
  email: z.string().email('유효한 이메일을 입력해주세요'),
  nickname: z.string().min(2, '닉네임은 2자 이상이어야 합니다').max(50, '닉네임은 50자 이하여야 합니다'),
  password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다'),
});

export async function POST(request: NextRequest) {
  // Rate limiting
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: '너무 많은 가입 시도입니다. 15분 후 다시 시도해주세요' },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();

    // Validate input
    const result = registerSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { email, nickname, password } = result.data;

    // Check if email already exists
    const existingEmail = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingEmail.length > 0) {
      return NextResponse.json(
        { error: '이미 사용 중인 이메일입니다' },
        { status: 400 }
      );
    }

    // Check if nickname already exists
    const existingNickname = await db
      .select()
      .from(users)
      .where(eq(users.nickname, nickname))
      .limit(1);

    if (existingNickname.length > 0) {
      return NextResponse.json(
        { error: '이미 사용 중인 닉네임입니다' },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user — wrap in try-catch to handle unique constraint race conditions
    let newUser: typeof users.$inferSelect;
    try {
      const inserted = await db
        .insert(users)
        .values({
          email,
          nickname,
          passwordHash,
          points: 1000, // Initial points
        })
        .returning();
      newUser = inserted[0];
    } catch (insertError: any) {
      // PostgreSQL unique violation error code
      if (insertError?.code === '23505') {
        const detail: string = insertError?.detail ?? '';
        if (detail.includes('email')) {
          return NextResponse.json(
            { error: '이메일이 이미 사용 중입니다' },
            { status: 400 }
          );
        }
        if (detail.includes('nickname')) {
          return NextResponse.json(
            { error: '닉네임이 이미 사용 중입니다' },
            { status: 400 }
          );
        }
        return NextResponse.json(
          { error: '이미 사용 중인 이메일 또는 닉네임입니다' },
          { status: 400 }
        );
      }
      throw insertError;
    }

    // Award initial points transaction + create default settings
    await Promise.all([
      db.insert(pointTransactions).values({
        userId: newUser.id,
        amount: 1000,
        balanceAfter: 1000,
        type: 'admin_adjust',
        description: '회원가입 축하 포인트',
      }),
      db.insert(userSettings).values({
        userId: newUser.id,
      }),
    ]);

    // Create session
    await createSession({
      userId: newUser.id,
      email: newUser.email,
      nickname: newUser.nickname,
      role: newUser.role,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        nickname: newUser.nickname,
        level: newUser.level,
        points: newUser.points,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: '회원가입 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
