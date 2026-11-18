"use client"

import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import DOMPurify from "dompurify"
import {
  Bold,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  Quote,
  Redo,
  Strikethrough,
  Undo,
} from "lucide-react"
import { useEffect } from "react"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Toggle } from "@/components/ui/toggle"
import { WithTooltip } from "@/components/ui/tooltip"
import { cn } from "@/utils/cn"

export interface RichTextEditorProps {
  content?: string
  onChange?: (content: string) => void
  placeholder?: string
  editable?: boolean
  className?: string
}

export function RichTextEditor({
  content = "",
  onChange,
  placeholder = "Start typing...",
  editable = true,
  className,
}: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      const sanitized = DOMPurify.sanitize(html)
      onChange?.(sanitized)
    },
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-base md:prose-sm mx-auto focus:outline-none text-black",
          "min-h-[100px] max-h-[500px] overflow-y-auto px-3 py-2 border-0"
        ),
      },
    },
  })

  // Content synchronization for controlled component behavior
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content, { emitUpdate: false })
    }
  }, [content, editor])

  if (!editor) {
    return null
  }

  return (
    <div className={cn("border-[1px] rounded-control overflow-hidden focus-within:border-[1.5px]", className)}>
      <div
        className="border-b p-2 flex flex-wrap items-center gap-1"
        role="toolbar"
        aria-label="Text formatting toolbar"
      >
        <WithTooltip
          content="Bold"
          side="top"
          trigger={
            <Toggle
              size="sm"
              pressed={editor.isActive("bold")}
              onPressedChange={() => editor.chain().focus().toggleBold().run()}
              disabled={!editor.can().chain().focus().toggleBold().run()}
              aria-label="Toggle bold formatting"
            >
              <Bold />
            </Toggle>
          }
        />

        <WithTooltip
          content="Italic"
          side="top"
          trigger={
            <Toggle
              size="sm"
              pressed={editor.isActive("italic")}
              onPressedChange={() => editor.chain().focus().toggleItalic().run()}
              disabled={!editor.can().chain().focus().toggleItalic().run()}
              aria-label="Toggle italic formatting"
            >
              <Italic className="h-4 w-4" />
            </Toggle>
          }
        />

        <WithTooltip
          content="Strikethrough"
          side="top"
          trigger={
            <Toggle
              size="sm"
              pressed={editor.isActive("strike")}
              onPressedChange={() => editor.chain().focus().toggleStrike().run()}
              disabled={!editor.can().chain().focus().toggleStrike().run()}
              aria-label="Toggle strikethrough formatting"
            >
              <Strikethrough className="h-4 w-4" />
            </Toggle>
          }
        />

        <Separator orientation="vertical" className="h-6" />

        <WithTooltip
          content="Heading 1"
          side="top"
          trigger={
            <Toggle
              size="sm"
              pressed={editor.isActive("heading", { level: 1 })}
              onPressedChange={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              aria-label="Toggle heading 1"
            >
              <Heading1 className="h-4 w-4" />
            </Toggle>
          }
        />

        <WithTooltip
          content="Heading 2"
          side="top"
          trigger={
            <Toggle
              size="sm"
              pressed={editor.isActive("heading", { level: 2 })}
              onPressedChange={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              aria-label="Toggle heading 2"
            >
              <Heading2 className="h-4 w-4" />
            </Toggle>
          }
        />

        <WithTooltip
          content="Heading 3"
          side="top"
          trigger={
            <Toggle
              size="sm"
              pressed={editor.isActive("heading", { level: 3 })}
              onPressedChange={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              aria-label="Toggle heading 3"
            >
              <Heading3 className="h-4 w-4" />
            </Toggle>
          }
        />

        <Separator orientation="vertical" className="h-6" />

        <WithTooltip
          content="Bullet List"
          side="top"
          trigger={
            <Toggle
              size="sm"
              pressed={editor.isActive("bulletList")}
              onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
              aria-label="Toggle bullet list"
            >
              <List className="h-4 w-4" />
            </Toggle>
          }
        />

        <WithTooltip
          content="Ordered List"
          side="top"
          trigger={
            <Toggle
              size="sm"
              pressed={editor.isActive("orderedList")}
              onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
              aria-label="Toggle ordered list"
            >
              <ListOrdered className="h-4 w-4" />
            </Toggle>
          }
        />

        <WithTooltip
          content="Blockquote"
          side="top"
          trigger={
            <Toggle
              size="sm"
              pressed={editor.isActive("blockquote")}
              onPressedChange={() => editor.chain().focus().toggleBlockquote().run()}
              aria-label="Toggle blockquote"
            >
              <Quote className="h-4 w-4" />
            </Toggle>
          }
        />

        <Separator orientation="vertical" className="h-6" />

        <WithTooltip
          content="Undo"
          side="top"
          trigger={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().chain().focus().undo().run()}
              aria-label="Undo last action"
            >
              <Undo className="h-4 w-4" />
            </Button>
          }
        />

        <WithTooltip
          content="Redo"
          side="top"
          trigger={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().chain().focus().redo().run()}
              aria-label="Redo last undone action"
            >
              <Redo className="h-4 w-4" />
            </Button>
          }
        />
      </div>

      <EditorContent editor={editor} placeholder={placeholder} aria-label="Rich text editor" />
    </div>
  )
}
