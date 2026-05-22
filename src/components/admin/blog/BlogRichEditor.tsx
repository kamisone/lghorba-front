"use client";

import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import TextAlign from "@tiptap/extension-text-align";
import { useEffect, useRef, useState, useCallback } from "react";
import styles from "./BlogRichEditor.module.css";

interface Props {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

// ── Toolbar button helper ──────────────────────────────────────────────────────

function Btn({
  label, active, onClick, title,
}: { label: string; active: boolean; onClick: () => void; title: string }) {
  return (
    <button
      type="button"
      title={title}
      className={`${styles.tbBtn} ${active ? styles.tbBtnActive : ""}`}
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
    >
      {label}
    </button>
  );
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function BlogRichEditor({ content, onChange, placeholder }: Props) {
  const [linkOpen,  setLinkOpen]  = useState(false);
  const [linkValue, setLinkValue] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef    = useRef<Editor | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({ inline: false, allowBase64: false }),
      Link.configure({ openOnClick: false, autolink: true }),
      Placeholder.configure({ placeholder: placeholder ?? "Start writing your article…" }),
      CharacterCount,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content,
    editorProps: {
      attributes: { class: styles.editor },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  useEffect(() => { editorRef.current = editor; }, [editor]);

  useEffect(() => {
    if (editor && !editor.isDestroyed && editor.getHTML() !== content) {
      editor.commands.setContent(content, false);
    }
  }, [content, editor]);

  const openLinkDialog = useCallback(() => {
    if (!editor) return;
    const existing = editor.getAttributes("link").href ?? "";
    setLinkValue(existing);
    setLinkOpen(true);
  }, [editor]);

  const applyLink = useCallback(() => {
    if (!editor) return;
    if (!linkValue) {
      editor.chain().focus().unsetLink().run();
    } else {
      editor.chain().focus().setLink({ href: linkValue, target: "_blank" }).run();
    }
    setLinkOpen(false);
  }, [editor, linkValue]);

  const handleImageUpload = useCallback(async (file: File) => {
    if (!editor) return;
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res  = await fetch("/next-api/blog/media", { method: "POST", body: fd });
      const data = await res.json() as { url: string };
      editor.chain().focus().setImage({ src: data.url, alt: file.name }).run();
    } catch {
      alert("Image upload failed — check console.");
    }
  }, [editor]);

  if (!editor) return null;

  const words = editor.storage.characterCount?.words?.() ?? 0;
  const chars = editor.storage.characterCount?.characters?.() ?? 0;

  return (
    <div className={styles.wrapper}>
      {/* ── Toolbar ── */}
      <div className={styles.toolbar}>
        {/* Headings */}
        <Btn label="H1" active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="Heading 1" />
        <Btn label="H2" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading 2" />
        <Btn label="H3" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Heading 3" />
        <span className={styles.tbDivider} />

        {/* Inline formatting */}
        <Btn label="B"  active={editor.isActive("bold")}          onClick={() => editor.chain().focus().toggleBold().run()}    title="Bold" />
        <Btn label="I"  active={editor.isActive("italic")}        onClick={() => editor.chain().focus().toggleItalic().run()}  title="Italic" />
        <Btn label="S"  active={editor.isActive("strike")}        onClick={() => editor.chain().focus().toggleStrike().run()}  title="Strikethrough" />
        <Btn label="` " active={editor.isActive("code")}          onClick={() => editor.chain().focus().toggleCode().run()}    title="Inline code" />
        <span className={styles.tbDivider} />

        {/* Blocks */}
        <Btn label="•—" active={editor.isActive("bulletList")}    onClick={() => editor.chain().focus().toggleBulletList().run()}   title="Bullet list" />
        <Btn label="1—" active={editor.isActive("orderedList")}   onClick={() => editor.chain().focus().toggleOrderedList().run()}  title="Numbered list" />
        <Btn label="❝"  active={editor.isActive("blockquote")}   onClick={() => editor.chain().focus().toggleBlockquote().run()}   title="Blockquote" />
        <Btn label="<>" active={editor.isActive("codeBlock")}     onClick={() => editor.chain().focus().toggleCodeBlock().run()}    title="Code block" />
        <Btn label="—"  active={false}                            onClick={() => editor.chain().focus().setHorizontalRule().run()}  title="Horizontal rule" />
        <span className={styles.tbDivider} />

        {/* Alignment */}
        <Btn label="≡L" active={editor.isActive({ textAlign: "left" })}    onClick={() => editor.chain().focus().setTextAlign("left").run()}    title="Align left" />
        <Btn label="≡C" active={editor.isActive({ textAlign: "center" })}  onClick={() => editor.chain().focus().setTextAlign("center").run()}  title="Align center" />
        <Btn label="≡R" active={editor.isActive({ textAlign: "right" })}   onClick={() => editor.chain().focus().setTextAlign("right").run()}   title="Align right" />
        <span className={styles.tbDivider} />

        {/* Link */}
        <Btn label="🔗" active={editor.isActive("link")} onClick={openLinkDialog} title="Insert / edit link" />

        {/* Image upload */}
        <button
          type="button"
          className={styles.tbBtn}
          title="Insert image"
          onMouseDown={(e) => { e.preventDefault(); fileInputRef.current?.click(); }}
        >
          🖼
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleImageUpload(f);
            e.target.value = "";
          }}
        />
        <span className={styles.tbDivider} />

        {/* History */}
        <Btn label="↩" active={false} onClick={() => editor.chain().focus().undo().run()} title="Undo" />
        <Btn label="↪" active={false} onClick={() => editor.chain().focus().redo().run()} title="Redo" />
      </div>

      {/* ── Editor ── */}
      <EditorContent editor={editor} />

      {/* ── Footer ── */}
      <div className={styles.footer}>
        <span>{words} words</span>
        <span>{chars} chars</span>
        <span>~{Math.max(1, Math.ceil(words / 200))} min read</span>
      </div>

      {/* ── Link modal ── */}
      {linkOpen && (
        <div className={styles.linkModal} onClick={() => setLinkOpen(false)}>
          <div className={styles.linkBox} onClick={(e) => e.stopPropagation()}>
            <h4>Insert / edit link</h4>
            <input
              className={styles.linkInput}
              type="url"
              placeholder="https://example.com"
              value={linkValue}
              onChange={(e) => setLinkValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") applyLink(); if (e.key === "Escape") setLinkOpen(false); }}
              autoFocus
            />
            <div className={styles.linkActions}>
              <button className={styles.btnGhost} type="button" onClick={() => setLinkOpen(false)}>Cancel</button>
              {editor.isActive("link") && (
                <button className={styles.btnGhost} type="button" onClick={() => {
                  editor.chain().focus().unsetLink().run();
                  setLinkOpen(false);
                }}>Remove</button>
              )}
              <button className={styles.btnPrimary} type="button" onClick={applyLink}>Apply</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
