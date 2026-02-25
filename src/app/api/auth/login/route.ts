import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { verifyPassword } from '@/lib/auth/password';
import { createSession } from '@/lib/auth/session';
import { eq } from 'drizzle-orm';

// --- In-memory rate limiter: 10 login attempts per IP per 15 minutes ---
// NOTE: On Vercel serverless, this Map resets per cold start. For production-grade
// rate limiting, migrate to Vercel KV or Upstash Redis. The in-memory approach
// still provides protection within a warm container instance.
interface RateLimitEntry {
  count: number;
  resetAt: number;
}
const loginRateLimitMap = new Map<string, RateLimitEntry>();
const LOGIN_RATE_LIMIT_MAX = 10;
const LOGIN_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function checkLoginRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = loginRateLimitMap.get(ip);

  // Lazy cleanup: remove expired entry
  if (entry && now > entry.resetAt) {
    loginRateLimitMap.delete(ip);
  }

  const current = loginRateLimitMap.get(ip);
  if (!current) {
    loginRateLimitMap.set(ip, { count: 1, resetAt: now + LOGIN_RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (current.count >= LOGIN_RATE_LIMIT_MAX) {
    return false;
  }

  current.count += 1;
  return true;
}

const loginSchema = z.object({
  email: z.string().email('유효한 이메일을 입력해주세요'),
  password: z.string().min(1, '비밀번호를 입력해주세요'),
});

export async function POST(request: NextRequest) {
  // Rate limiting
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';

  if (!checkLoginRateLimit(ip)) {
    return NextResponse.json(
      { error: '너무 많은 로그인 시도입니다. 15분 후 다시 시도해주세요' },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();

    // Validate input
    const result = loginSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { email, password } = result.data;

    // Find user by email
    let user;
    try {
      const result = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      user = result[0];
    } catch (dbError) {
      console.error('Login DB error:', dbError);
      return NextResponse.json(
        { error: '데이터베이스 연결에 실패했습니다. 잠시 후 다시 시도해주세요.' },
        { status: 503 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: '이메일 또는 비밀번호가 올바르지 않습니다' },
        { status: 401 }
      );
    }

    // Check if user is suspended or banned
    if (user.status === 'suspended' || user.status === 'banned') {
      return NextResponse.json(
        { error: '정지 또는 차단된 계정입니다' },
        { status: 403 }
      );
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: '이메일 또는 비밀번호가 올바르지 않습니다' },
        { status: 401 }
      );
    }

    // Create session
    try {
      await createSession({
        userId: user.id,
        email: user.email,
        nickname: user.nickname,
        role: user.role,
      });
    } catch (sessionError) {
      console.error('Session creation error:', sessionError);
      return NextResponse.json(
        { error: '세션 발급에 실패했습니다. 브라우저 쿠키 설정을 확인해주세요.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        level: user.level,
        points: user.points,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: '로그인 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
