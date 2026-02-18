'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createPost } from '@/app/(boards)/actions';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { RichTextEditor } from '@/components/editor/RichTextEditor';

interface Board {
  id: string;
  slug: string;
  nameKo: string;
  description: string | null;
}

interface PostEditorProps {
  currentBoardId: string;
  currentBoardSlug: string;
  boards: Board[];
  userId: string;
}

export function PostEditor({
  currentBoardId,
  currentBoardSlug,
  boards,
  userId,
}: PostEditorProps) {
  const router = useRouter();
  const [boardId, setBoardId] = useState(currentBoardId);
  const [title, setTitle] = useState('');
  const [contentText, setContentText] = useState('');
  const [contentHtml, setContentHtml] = useState('');
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<{
    title?: string;
    content?: string;
  }>({});

  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (!title.trim()) {
      newErrors.title = '제목을 입력해주세요';
    } else if (title.length < 2) {
      newErrors.title = '제목은 최소 2자 이상 입력해주세요';
    } else if (title.length > 200) {
      newErrors.title = '제목은 200자를 초과할 수 없습니다';
    }

    if (!contentText.trim()) {
      newErrors.content = '내용을 입력해주세요';
    } else if (contentText.length < 10) {
      newErrors.content = '내용은 최소 10자 이상 입력해주세요';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    startTransition(async () => {
      const result = await createPost({
        boardId,
        title: title.trim(),
        content: contentText.trim(),
        contentHtml: contentHtml,
        isPinned: false,
        isFeatured: false,
      });

      if (result.success && result.postId) {
        toast.success('게시글이 작성되었습니다');
        const selectedBoard = boards.find((b) => b.id === boardId);
        const targetSlug = selectedBoard?.slug || currentBoardSlug;
        router.push(`/board/${targetSlug}/${result.postId}`);
      } else {
        toast.error(result.error || '게시글 작성에 실패했습니다');
      }
    });
  };

  const handleCancel = () => {
    if (title || contentText) {
      const confirmed = window.confirm('작성 중인 내용이 있습니다. 정말 취소하시겠습니까?');
      if (!confirmed) return;
    }
    router.push(`/board/${currentBoardSlug}`);
  };

  const handleEditorChange = (html: string, text: string) => {
    setContentHtml(html);
    setContentText(text);
    if (errors.content) setErrors({ ...errors, content: undefined });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Board selector */}
      <div>
        <label
          htmlFor="board"
          className="block text-sm font-medium text-op-text-secondary mb-2"
        >
          게시판
        </label>
        <select
          id="board"
          value={boardId}
          onChange={(e) => setBoardId(e.target.value)}
          className="w-full px-4 py-2 bg-op-surface border border-op-border rounded-lg text-op-text focus:outline-none focus:ring-2 focus:ring-op-gold"
          disabled={isPending}
        >
          {boards.map((board) => (
            <option key={board.id} value={board.id}>
              {board.nameKo}
            </option>
          ))}
        </select>
      </div>

      {/* Title input */}
      <div>
        <label
          htmlFor="title"
          className="block text-sm font-medium text-op-text mb-2"
        >
          제목 <span className="text-op-error">*</span>
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (errors.title) setErrors({ ...errors, title: undefined });
          }}
          placeholder="제목을 입력하세요"
          className={cn(
            "w-full px-4 py-3 bg-op-bg border text-op-text placeholder:text-op-text-muted rounded-lg focus:outline-none disabled:opacity-50",
            errors.title ? 'border-op-error focus:border-op-error' : 'border-op-border focus:border-op-gold'
          )}
          maxLength={200}
          disabled={isPending}
        />
        <div className="mt-1 flex justify-between items-center">
          {errors.title && (
            <span className="text-sm text-op-error">{errors.title}</span>
          )}
          <span className="text-xs text-op-text-muted ml-auto">
            {title.length}/200
          </span>
        </div>
      </div>

      {/* Content editor */}
      <div>
        <label
          htmlFor="content"
          className="block text-sm font-medium text-op-text mb-2"
        >
          내용 <span className="text-op-error">*</span>
        </label>
        <div
          className={cn(
            "rounded-lg",
            errors.content && "ring-2 ring-op-error"
          )}
        >
          <RichTextEditor
            content={contentHtml}
            onChange={handleEditorChange}
            placeholder="내용을 입력하세요"
            disabled={isPending}
          />
        </div>
        {errors.content && (
          <div className="mt-1">
            <span className="text-sm text-op-error">{errors.content}</span>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 justify-end pt-4 border-t border-op-border">
        <button
          type="button"
          onClick={handleCancel}
          disabled={isPending}
          className="px-6 py-3 bg-op-elevated hover:bg-op-border text-op-text rounded-lg font-medium transition-colors disabled:opacity-50 min-h-[44px]"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="px-6 py-3 bg-op-gold hover:bg-op-gold-hover text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:bg-op-text-dim min-h-[44px]"
        >
          {isPending ? '작성 중...' : '게시글 작성'}
        </button>
      </div>
    </form>
  );
}
