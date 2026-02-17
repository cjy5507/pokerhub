import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { v4 as uuidv4 } from 'uuid';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

/**
 * 이미지 업로드 API
 *
 * **중요**: Supabase Storage에서 'posts' 버킷을 미리 생성해야 합니다.
 *
 * Supabase 대시보드 -> Storage -> New Bucket -> 'posts' 생성
 * 버킷 설정: Public bucket (공개 URL 접근 가능)
 */
export async function POST(request: NextRequest) {
  try {
    // 1. 인증 확인
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    // 2. FormData 파싱
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: '파일이 업로드되지 않았습니다.' },
        { status: 400 }
      );
    }

    // 3. 파일 검증 - 타입
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: '지원하지 않는 파일 형식입니다. (JPG, PNG, GIF, WebP만 가능)' },
        { status: 400 }
      );
    }

    // 4. 파일 검증 - 크기
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: '파일 크기는 5MB 이하여야 합니다.' },
        { status: 400 }
      );
    }

    // 5. 파일 확장자 추출
    const fileExt = file.name.split('.').pop() || 'jpg';

    // 6. 고유 파일명 생성: posts/{userId}/{timestamp}-{randomId}.{ext}
    const timestamp = Date.now();
    const randomId = uuidv4();
    const fileName = `${timestamp}-${randomId}.${fileExt}`;
    const filePath = `posts/${session.userId}/${fileName}`;

    // 7. 파일을 ArrayBuffer로 변환
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 8. Supabase Storage에 업로드
    const supabase = createAdminClient();

    // 버킷 확인 및 생성
    const { data: buckets } = await supabase.storage.listBuckets();
    const postsBucket = buckets?.find((b) => b.name === 'posts');
    if (!postsBucket) {
      await supabase.storage.createBucket('posts', { public: true });
    }

    const { data, error } = await supabase.storage
      .from('posts')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      console.error('Supabase upload error:', error);
      return NextResponse.json(
        { error: '파일 업로드에 실패했습니다.' },
        { status: 500 }
      );
    }

    // 9. Public URL 생성
    const { data: urlData } = supabase.storage
      .from('posts')
      .getPublicUrl(data.path);

    // 10. URL 반환
    return NextResponse.json({ url: urlData.publicUrl });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: '파일 업로드 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
