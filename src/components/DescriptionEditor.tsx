import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import { useRef, useCallback } from 'react'
import { ImagePlus } from 'lucide-react'

interface Props {
  content: string
  onChange: (html: string) => void
}

export default function DescriptionEditor({ content, onChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: { class: 'desc-img' },
      }),
      Placeholder.configure({ placeholder: '添加详细描述，支持图片粘贴或插入...' }),
    ],
    content: content || '',
    onBlur: ({ editor }) => {
      const html = editor.getHTML()
      if (html !== content) onChange(html)
    },
    editorProps: {
      attributes: {
        class: 'prose prose-stone max-w-none min-h-[140px] px-3 py-2.5 text-sm outline-none leading-relaxed text-stone-700 dark:text-stone-300',
      },
    },
  })

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !editor) return
    const reader = new FileReader()
    reader.onload = () => {
      const url = reader.result as string
      editor.chain().focus().setImage({ src: url }).run()
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }, [editor])

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items || !editor) return
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const file = item.getAsFile()
        if (!file) continue
        const reader = new FileReader()
        reader.onload = () => {
          editor.chain().setImage({ src: reader.result as string }).run()
        }
        reader.readAsDataURL(file)
      }
    }
  }, [editor])

  if (!editor) return null

  return (
    <div className="relative bg-[#faf7f5] dark:bg-[#141723] border border-[#e8e0d9] dark:border-[#1e2233] rounded-lg overflow-hidden focus-within:border-[#c2410c] focus-within:bg-white dark:focus-within:bg-[#141723] dark:focus-within:border-[#3d7ae0] transition-colors">
      <div className="flex items-center gap-1 px-2 pt-1.5 pb-0.5 border-b border-[#e8e0d9]/50 dark:border-[#1e2233]/50 bg-[#f3ede8]/30 dark:bg-[#141723]/60">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="p-1.5 rounded text-stone-400 dark:text-stone-500 hover:text-[#c2410c] dark:hover:text-[#3d7ae0] hover:bg-[#f3ede8] dark:hover:bg-[#232638] transition-colors"
          title="插入图片"
        >
          <ImagePlus size={15} />
        </button>
        <span className="text-[10px] text-stone-400 dark:text-stone-500 ml-auto">支持图片粘贴</span>
      </div>
      <div onPaste={handlePaste}>
        <EditorContent editor={editor} />
      </div>
      <input ref={fileRef} type="file" hidden accept="image/*" onChange={handleImageUpload} />
    </div>
  )
}
