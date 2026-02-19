'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email('유효한 이메일을 입력해주세요'),
  nickname: z.string().min(2, '닉네임은 2자 이상이어야 합니다').max(50, '닉네임은 50자 이하여야 합니다'),
  password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다'),
  confirmPassword: z.string(),
  agreePrivacy: z.literal(true, { error: '개인정보처리방침에 동의해주세요' }),
}).refine((data) => data.password === data.confirmPassword, {
  message: '비밀번호가 일치하지 않습니다',
  path: ['confirmPassword'],
});

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<{
    email: string;
    nickname: string;
    password: string;
    confirmPassword: string;
    agreePrivacy: boolean;
  }>({
    email: '',
    nickname: '',
    password: '',
    confirmPassword: '',
    agreePrivacy: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setServerError('');

    // Validate form
    const result = registerSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((error) => {
        if (error.path[0]) {
          fieldErrors[error.path[0] as string] = error.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          nickname: formData.nickname,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setServerError(data.error || '회원가입에 실패했습니다');
        return;
      }

      // Redirect to home page
      router.push('/');
      router.refresh();
    } catch (error) {
      setServerError('네트워크 오류가 발생했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">회원가입</h1>
          <p className="text-op-text-secondary">Open Poker에 오신 것을 환영합니다</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {serverError && (
            <div className="p-3 bg-op-error-dim border border-op-error rounded-md text-op-error text-sm">
              {serverError}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2">
              이메일
            </label>
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2.5 rounded-md bg-op-surface border border-op-border focus:outline-none focus:ring-2 focus:ring-op-gold"
              placeholder="your@email.com"
              disabled={isLoading}
            />
            {errors.email && <p className="mt-1 text-sm text-op-error">{errors.email}</p>}
          </div>

          <div>
            <label htmlFor="nickname" className="block text-sm font-medium mb-2">
              닉네임
            </label>
            <input
              id="nickname"
              type="text"
              value={formData.nickname}
              onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
              className="w-full px-4 py-2.5 rounded-md bg-op-surface border border-op-border focus:outline-none focus:ring-2 focus:ring-op-gold"
              placeholder="닉네임"
              disabled={isLoading}
            />
            {errors.nickname && <p className="mt-1 text-sm text-op-error">{errors.nickname}</p>}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-2">
              비밀번호
            </label>
            <input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-2.5 rounded-md bg-op-surface border border-op-border focus:outline-none focus:ring-2 focus:ring-op-gold"
              placeholder="8자 이상"
              disabled={isLoading}
            />
            {errors.password && <p className="mt-1 text-sm text-op-error">{errors.password}</p>}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2">
              비밀번호 확인
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              className="w-full px-4 py-2.5 rounded-md bg-op-surface border border-op-border focus:outline-none focus:ring-2 focus:ring-op-gold"
              placeholder="비밀번호 재입력"
              disabled={isLoading}
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-op-error">{errors.confirmPassword}</p>
            )}
          </div>

          <div className="flex items-start gap-2">
            <input
              id="agreePrivacy"
              type="checkbox"
              checked={formData.agreePrivacy}
              onChange={(e) => setFormData({ ...formData, agreePrivacy: e.target.checked })}
              className="mt-1 w-4 h-4 accent-op-gold"
              disabled={isLoading}
            />
            <label htmlFor="agreePrivacy" className="text-sm text-op-text-secondary">
              <a href="/privacy" target="_blank" className="text-op-gold hover:underline">개인정보처리방침</a>
              {'과 '}
              <a href="/terms" target="_blank" className="text-op-gold hover:underline">이용약관</a>
              에 동의합니다. <span className="text-op-error">*</span>
            </label>
          </div>
          {errors.agreePrivacy && <p className="mt-1 text-sm text-op-error">{errors.agreePrivacy}</p>}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-op-gold text-op-text-inverse rounded-md font-medium hover:bg-op-gold-hover disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '처리 중...' : '가입하기'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-op-text-secondary">
          이미 계정이 있으신가요?{' '}
          <Link href="/login" className="text-op-gold hover:underline">
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}
