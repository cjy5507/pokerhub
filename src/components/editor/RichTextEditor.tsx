'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { EditorToolbar } from './EditorToolbar';

interface RichTextEditorProps {
  content: string;
  onChange: (html: string, text: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function RichTextEditor({ content, onChange, placeholder, disabled }: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Image.configure({ inline: true, allowBase64: false }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-ph-gold underline' }
      }),
      Placeholder.configure({ placeholder: placeholder || '내용을 입력하세요' }),
    ],
    content,
    editable: !disabled,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML(), editor.getText());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none min-h-[300px] px-4 py-3 focus:outline-none',
      },
    },
  });

  return (
    <div className="border border-ph-border rounded-lg overflow-hidden bg-ph-bg">
      <EditorToolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
