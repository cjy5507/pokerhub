'use client';

import { useRef, useState } from 'react';
import { Editor } from '@tiptap/react';
import { Image as ImageIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ImageUploadButtonProps {
  editor: Editor | null;
}

export function ImageUploadButton({ editor }: ImageUploadButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  if (!editor) {
    return null;
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('이미지 파일만 업로드할 수 있습니다');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('이미지 크기는 5MB를 초과할 수 없습니다');
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('업로드 실패');
      }

      const data = await response.json();

      if (data.url) {
        editor.chain().focus().setImage({ src: data.url }).run();
        toast.success('이미지가 업로드되었습니다');
      } else {
        throw new Error('이미지 URL을 받지 못했습니다');
      }
    } catch (error) {
      console.error('Image upload error:', error);
      toast.error('이미지 업로드에 실패했습니다');
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      <button
        type="button"
        onClick={handleButtonClick}
        disabled={isUploading}
        title="이미지 업로드"
        className="p-2 rounded transition-colors hover:bg-ph-elevated text-ph-text-secondary disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isUploading ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <ImageIcon size={18} />
        )}
      </button>
    </>
  );
}
