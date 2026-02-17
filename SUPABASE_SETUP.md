# Supabase 설정 완료

## 구현된 파일

### 1. Supabase 클라이언트 유틸리티

#### `/src/lib/supabase/client.ts` (브라우저용)
- 클라이언트 사이드에서 사용하는 Supabase 클라이언트
- React 컴포넌트에서 사용

```typescript
import { createClient } from '@/lib/supabase/client';
const supabase = createClient();
```

#### `/src/lib/supabase/server.ts` (서버용)
- Server Components, API Routes에서 사용
- 쿠키 기반 세션 관리

```typescript
import { createServerSupabaseClient } from '@/lib/supabase/server';
const supabase = await createServerSupabaseClient();
```

#### `/src/lib/supabase/admin.ts` (관리자 권한)
- 서비스 역할 키 사용
- 파일 업로드 등 관리자 작업에 사용

```typescript
import { createAdminClient } from '@/lib/supabase/admin';
const supabase = createAdminClient();
```

### 2. 이미지 업로드 API

#### `/src/app/api/upload/route.ts`
- POST 엔드포인트
- 파일 검증: 최대 5MB, JPG/PNG/GIF/WebP만 허용
- 인증 필수 (JWT 세션)
- Supabase Storage 'posts' 버킷에 업로드
- 경로: `posts/{userId}/{timestamp}-{randomId}.{ext}`

**사용 예시:**
```typescript
const formData = new FormData();
formData.append('file', file);

const response = await fetch('/api/upload', {
  method: 'POST',
  body: formData,
});

const { url } = await response.json();
```

## 필수 설정

### 1. 환경변수 (.env.local)
실제 값으로 교체 필요:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 2. Supabase Storage 버킷 생성
1. Supabase 대시보드 접속
2. Storage 메뉴 선택
3. "New Bucket" 클릭
4. 버킷 이름: `posts`
5. Public bucket 설정 (공개 URL 접근 가능)
6. 생성 완료

## 설치된 패키지
- `@supabase/supabase-js@2.95.3` - Supabase 클라이언트
- `@supabase/ssr@0.8.0` - SSR 지원
- `uuid@13.0.0` - 고유 파일명 생성
- `@types/uuid` - TypeScript 타입

## 빌드 상태
✅ 모든 Supabase 파일 생성 완료
✅ 필요한 패키지 설치 완료
⚠️ 프로젝트에 기존 TypeScript 에러 존재 (EditorToolbar 관련)
  → Supabase 구현과는 무관한 기존 에러
