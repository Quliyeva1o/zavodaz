"use client";

import { useState } from "react";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import type { RichDoc } from "@/features/pages/types";

const SAFE_URL = /^(https?:|mailto:)/i;

const EDITOR_CLASS =
  "min-h-64 rounded-b-[4px] bg-white px-3 py-2 text-body-md text-gray-700 focus:outline-none " +
  "[&_h2]:pt-4 [&_h2]:text-h5 [&_h3]:pt-2 [&_h3]:text-subtitle-1-medium [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_a]:underline";

function ToolButton({ label, active, disabled, onClick }: { label: string; active?: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`h-9 rounded-[4px] px-2.5 text-body-sm disabled:opacity-40 ${active ? "bg-brand-950 text-white" : "hover:bg-gray-100"}`}
    >
      {label}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      link: e.isActive("link"),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });

  const setLink = () => {
    const previous = (editor.getAttributes("link").href as string | undefined) ?? "";
    const url = window.prompt("Link ünvanı (https://… və ya mailto:…). Linki silmək üçün boş buraxın.", previous);
    if (url === null) return;
    const value = url.trim();
    if (value === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    if (!SAFE_URL.test(value)) {
      window.alert("Yalnız https://, http:// və ya mailto: ünvanlarına icazə verilir.");
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: value }).run();
  };

  return (
    <div role="toolbar" aria-label="Mətn alətləri" className="flex flex-wrap gap-1 rounded-t-[4px] border-b border-gray-200 bg-gray-50 p-1.5">
      <ToolButton label="H2" active={s.h2} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} />
      <ToolButton label="H3" active={s.h3} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} />
      <ToolButton label="Qalın" active={s.bold} onClick={() => editor.chain().focus().toggleBold().run()} />
      <ToolButton label="Kursiv" active={s.italic} onClick={() => editor.chain().focus().toggleItalic().run()} />
      <ToolButton label="Siyahı" active={s.bullet} onClick={() => editor.chain().focus().toggleBulletList().run()} />
      <ToolButton label="Nömrəli siyahı" active={s.ordered} onClick={() => editor.chain().focus().toggleOrderedList().run()} />
      <ToolButton label="Link" active={s.link} onClick={setLink} />
      <ToolButton label="Geri al" disabled={!s.canUndo} onClick={() => editor.chain().focus().undo().run()} />
      <ToolButton label="İrəli" disabled={!s.canRedo} onClick={() => editor.chain().focus().redo().run()} />
    </div>
  );
}

/**
 * Visual editor for the legal pages. Configured so it can only produce what `RichText` renders:
 * paragraphs, headings 2–3, bold, italic, http(s)/mailto links, bullet / ordered lists, line breaks.
 * Submits the document as JSON in a hidden input (empty → ""). `initial` is read once; remount with a new `key` to reset.
 */
export function RichTextEditor({
  name,
  initial,
  label,
  onChange,
}: {
  name: string;
  initial: RichDoc | null;
  label: string;
  onChange?: (doc: RichDoc | null) => void;
}) {
  const [json, setJson] = useState(() => (initial ? JSON.stringify(initial) : ""));
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        code: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
        strike: false,
        underline: false,
        link: { openOnClick: false, protocols: ["http", "https", "mailto"], autolink: true },
      }),
    ],
    content: initial ?? "",
    immediatelyRender: false,
    editorProps: { attributes: { class: EDITOR_CLASS, "aria-label": label, role: "textbox", "aria-multiline": "true" } },
    onUpdate: ({ editor: e }) => {
      const doc = e.isEmpty ? null : (e.getJSON() as RichDoc);
      setJson(doc ? JSON.stringify(doc) : "");
      onChange?.(doc);
    },
  });

  return (
    <div data-editor={name.replace(".", "-")} className="rounded-[4px] border border-gray-200 focus-within:border-brand-700">
      {editor ? <Toolbar editor={editor} /> : <div className="h-[49px] rounded-t-[4px] bg-gray-50" />}
      <EditorContent editor={editor} />
      <input type="hidden" name={name} value={json} />
    </div>
  );
}
