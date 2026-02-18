# Open Poker Infrastructure Documentation

## 완료된 작업

### Task #1: 프로젝트 스캐폴딩 ✅
- Next.js 16 프로젝트 생성 (App Router, TypeScript, Tailwind CSS)
- 모든 의존성 설치
- 폴더 구조 생성
- 다크 테마 설정

### Task #2: DB 스키마 ✅
- Drizzle ORM 스키마 정의 (26개 테이블, 22개 enum)
- Relations 정의
- 시드 스크립트
- 마이그레이션 설정

### Task #3: 인증 시스템 ✅
- 비밀번호 해싱 (bcrypt)
- JWT 세션 관리 (jose)
- API 라우트: 회원가입, 로그인, 로그아웃
- 미들웨어 (라우트 보호)
- 회원가입/로그인 페이지

## 데이터베이스 설정

### 1. Supabase 프로젝트 생성
1. https://supabase.com 접속
2. 새 프로젝트 생성
3. Database URL과 API Keys 복사

### 2. 환경 변수 설정
`.env.local` 파일에 다음 값 입력:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Database (Supabase Connection String)
DATABASE_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres

# Auth
JWT_SECRET=your-random-secret-key-at-least-32-characters

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. 데이터베이스 마이그레이션

```bash
# 1. 마이그레이션 파일 생성
npm run db:generate

# 2. 데이터베이스에 스키마 적용
npm run db:push

# 3. 기본 데이터 시드
npm run db:seed
```

### 4. Drizzle Studio 실행 (선택사항)

```bash
npm run db:studio
```

브라우저에서 https://local.drizzle.studio 접속

## 인증 시스템 사용법

### 회원가입
- URL: `/register`
- 필드: email, nickname, password, confirmPassword
- 초기 포인트: 1000점 자동 지급
- 자동 로그인 및 홈으로 리다이렉트

### 로그인
- URL: `/login`
- 필드: email, password
- 세션: 7일간 유지 (HttpOnly, Secure, SameSite 쿠키)

### 로그아웃
- API: `POST /api/auth/logout`
- Hook: `useAuth().logout()`

### 보호된 라우트
다음 라우트는 로그인 필수:
- `/profile/*`
- `/board/*/write`
- `/hands/share`
- `/attendance`
- `/admin` (admin 권한 필요)

## 데이터베이스 구조

### User Domain
- `users` - 사용자 정보
- `user_follows` - 팔로우 관계
- `user_blocks` - 차단 관계
- `user_settings` - 사용자 설정

### Content Domain
- `boards` - 게시판
- `posts` - 게시글
- `comments` - 댓글
- `post_likes`, `comment_likes` - 좋아요
- `bookmarks` - 북마크
- `tags`, `post_tags` - 태그
- `strategy_votes` - 전략 투표
- `reports` - 신고

### Poker Domain
- `poker_hands` - 핸드 히스토리
- `poker_hand_players` - 핸드 참가자
- `poker_hand_actions` - 핸드 액션
- `poker_hand_comments` - 핸드 댓글

### Gamification Domain
- `badges`, `user_badges` - 배지
- `missions`, `user_missions` - 미션
- `attendance` - 출석
- `user_streaks` - 연속 기록
- `point_transactions` - 포인트 거래
- `xp_transactions` - XP 거래
- `level_configs` - 레벨 설정 (1-50)

### Social Domain
- `notifications` - 알림
- `chat_rooms`, `chat_messages` - 채팅

### Admin Domain
- `banners` - 배너
- `admin_logs` - 관리자 로그

## 다음 단계

다른 팀원들이 작업할 항목:
- **UI 팀**: 레이아웃, 헤더, 푸터, 사이드바 컴포넌트
- **Features 팀**: 게시판 CRUD, 검색, 페이지네이션
- **Poker 팀**: 핸드 히스토리 비주얼라이저
- **Gamification 팀**: 출석 체크, 미션, 포인트 시스템

모든 인프라는 준비되었습니다! 🎉
