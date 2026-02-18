'use client';

import { Editor } from '@tiptap/react';
import {
  Bold,
  Italic,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Code,
  Link as LinkIcon,
  Image as ImageIcon,
  Minus,
  Heading2,
  Heading3,
} from 'lucide-react';
import { ImageUploadButton } from './ImageUploadButton';

interface EditorToolbarProps {
  editor: Editor | null;
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
  if (!editor) {
    return null;
  }

  const insertPokerSymbol = (symbol: string) => {
    editor.chain().focus().insertContent(symbol).run();
  };

  const addLink = () => {
    const url = prompt('링크 URL을 입력하세요:');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  const ToolbarButton = ({
    onClick,
    active = false,
    disabled = false,
    children,
    title,
  }: {
    onClick: () => void;
    active?: boolean;
    disabled?: boolean;
    children: React.ReactNode;
    title: string;
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-2 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
        active
          ? 'bg-ph-elevated text-ph-gold'
          : 'hover:bg-ph-elevated text-ph-text-secondary'
      }`}
    >
      {children}
    </button>
  );

  const ToolbarDivider = () => <div className="w-px h-6 bg-ph-border" />;

  return (
    <div className="sticky top-0 z-10 bg-ph-surface border-b border-ph-border p-2 flex items-center gap-1 overflow-x-auto">
      {/* Text formatting */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive('bold')}
        title="굵게 (Ctrl+B)"
      >
        <Bold size={18} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive('italic')}
        title="기울임 (Ctrl+I)"
      >
        <Italic size={18} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        active={editor.isActive('strike')}
        title="취소선"
      >
        <Strikethrough size={18} />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Headings */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        active={editor.isActive('heading', { level: 2 })}
        title="제목 2"
      >
        <Heading2 size={18} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        active={editor.isActive('heading', { level: 3 })}
        title="제목 3"
      >
        <Heading3 size={18} />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Lists */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive('bulletList')}
        title="순서 없는 목록"
      >
        <List size={18} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive('orderedList')}
        title="순서 있는 목록"
      >
        <ListOrdered size={18} />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Blocks */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        active={editor.isActive('blockquote')}
        title="인용구"
      >
        <Quote size={18} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        active={editor.isActive('codeBlock')}
        title="코드 블록"
      >
        <Code size={18} />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Insert */}
      <ToolbarButton onClick={addLink} active={editor.isActive('link')} title="링크 삽입">
        <LinkIcon size={18} />
      </ToolbarButton>
      <ImageUploadButton editor={editor} />

      <ToolbarDivider />

      {/* Poker symbols */}
      <ToolbarButton onClick={() => insertPokerSymbol('♠')} title="스페이드">
        <span className="poker-card-spade text-base">♠</span>
      </ToolbarButton>
      <ToolbarButton onClick={() => insertPokerSymbol('♥')} title="하트">
        <span className="poker-card-heart text-base">♥</span>
      </ToolbarButton>
      <ToolbarButton onClick={() => insertPokerSymbol('♦')} title="다이아몬드">
        <span className="poker-card-diamond text-base">♦</span>
      </ToolbarButton>
      <ToolbarButton onClick={() => insertPokerSymbol('♣')} title="클럽">
        <span className="poker-card-club text-base">♣</span>
      </ToolbarButton>

      <ToolbarDivider />

      {/* Horizontal rule */}
      <ToolbarButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="구분선"
      >
        <Minus size={18} />
      </ToolbarButton>
    </div>
  );
}
