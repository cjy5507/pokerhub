# Open Poker Quick Start

## 로컬 개발 환경

1. 의존성 설치: `npm install`
2. `.env.example`을 `.env.local`로 복사하고 값 설정:
   ```bash
   cp .env.example .env.local
   ```
3. DB 스키마 적용: `npm run db:push`
4. 시드 데이터 삽입: `npm run db:seed`
5. 개발 서버 실행: `npm run dev`

## Vercel 배포

1. Vercel CLI 설치: `npm i -g vercel`
2. `vercel` 실행 후 프로젝트 연결
3. 환경변수 설정:
   - `DATABASE_URL`: Supabase 연결 문자열
   - `JWT_SECRET`: 강력한 랜덤 문자열 (32자 이상)
   - `NEXT_PUBLIC_APP_URL`: 배포된 URL
4. DB 마이그레이션: `npm run db:push`
5. 시드 데이터: `npm run db:seed`
