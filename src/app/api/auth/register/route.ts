import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { users, pointTransactions } from '@/lib/db/schema';
import { hashPassword } from '@/lib/auth/password';
import { createSession } from '@/lib/auth/session';
import { eq } from 'drizzle-orm';

const registerSchema = z.object({
  email: z.string().email('유효한 이메일을 입력해주세요'),
  nickname: z.string().min(2, '닉네임은 2자 이상이어야 합니다').max(50, '닉네임은 50자 이하여야 합니다'),
  password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다'),
});

export async function POST(request: NextRequest) {
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

    // Create user
    const [newUser] = await db
      .insert(users)
      .values({
        email,
        nickname,
        passwordHash,
        points: 1000, // Initial points
      })
      .returning();

    // Award initial points transaction
    await db.insert(pointTransactions).values({
      userId: newUser.id,
      amount: 1000,
      balanceAfter: 1000,
      type: 'earn_post',
      description: '회원가입 축하 포인트',
    });

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
