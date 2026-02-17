'use client';

import { useState } from 'react';
import { ImagePlus } from 'lucide-react';
import { createThread, getThreadFeed, ThreadData } from '@/app/(social)/actions';
import { useRouter } from 'next/navigation';

interface ThreadComposeProps {
  onThreadCreated?: (thread: ThreadData) => void;
}

export function ThreadCompose({ onThreadCreated }: ThreadComposeProps) {
  const router = useRouter();
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  const maxChars = 500;
  const charsRemaining = maxChars - content.length;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('이미지 업로드에 실패했습니다');
      }

      const data = await response.json();
      setImageUrl(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : '이미지 업로드에 실패했습니다');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError('');

    const result = await createThread({
      content: content.trim(),
      imageUrl: imageUrl || undefined,
    });

    if (result.success) {
      setContent('');
      setImageUrl('');
      if (onThreadCreated) {
        // Fetch the created thread and pass to callback
        const feed = await getThreadFeed(1);
        const newThread = feed.threads.find((t) => t.id === result.threadId);
        if (newThread) {
          onThreadCreated(newThread);
        }
      } else {
        router.refresh();
      }
    } else {
      setError(result.error || '쓰레드 작성에 실패했습니다');
    }

    setIsSubmitting(false);
  };

  return (
    <div className="bg-[#1e1e1e] border border-[#333] rounded-lg p-4 space-y-3">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="무슨 생각을 하고 계신가요?"
        className="w-full bg-[#2a2a2a] border border-[#333] rounded-lg px-3 py-2 text-sm text-[#e0e0e0] placeholder:text-[#888] focus:outline-none focus:border-[#c9a227] resize-none"
        rows={3}
        maxLength={maxChars}
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="cursor-pointer p-2 text-[#a0a0a0] hover:text-[#c9a227] transition-colors">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              disabled={isUploading}
            />
            <ImagePlus className="w-5 h-5" />
          </label>

          {isUploading && (
            <span className="text-xs text-[#a0a0a0]">업로드 중...</span>
          )}

          {imageUrl && !isUploading && (
            <span className="text-xs text-[#c9a227]">이미지 첨부됨</span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`text-xs ${
              charsRemaining < 50 ? 'text-[#ef4444]' : 'text-[#888]'
            }`}
          >
            {charsRemaining}자
          </span>

          <button
            onClick={handleSubmit}
            disabled={!content.trim() || isSubmitting || isUploading}
            className="px-4 py-2 bg-[#c9a227] hover:bg-[#d4af37] text-black text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? '게시 중...' : '게시'}
          </button>
        </div>
      </div>

      {error && (
        <p className="text-xs text-[#ef4444]">{error}</p>
      )}
    </div>
  );
}
