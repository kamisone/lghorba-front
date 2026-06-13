"use client";

import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import { useEffect, useRef, useState, useCallback } from "react";
import MediaPicker, { type MediaAsset } from "@/components/admin/media/MediaPicker";
import styles from "./EmailEditor.module.css";

interface Props {
  content: string;
  onChange: (html: string) => void;
}

// ── Snippet library ─────────────────────────────────────────────────────────────

const SNIPPETS: { label: string; html: string }[] = [
  {
    label: "Header banner",
    html: `<div style="background:#1d4ed8;color:#ffffff;padding:32px 24px;text-align:center;border-radius:8px;margin-bottom:16px;"><h1 style="margin:0;font-size:24px;font-family:Arial,sans-serif;">Your Brand</h1><p style="margin:8px 0 0;font-size:14px;opacity:.9;">A short tagline goes here</p></div>`,
  },
  {
    label: "Call-to-action button",
    html: `<div style="text-align:center;margin:24px 0;"><a href="https://example.com" style="background:#1d4ed8;color:#ffffff;padding:12px 32px;border-radius:6px;text-decoration:none;font-weight:600;font-family:Arial,sans-serif;display:inline-block;">Shop Now</a></div>`,
  },
  {
    label: "Divider",
    html: `<hr />`,
  },
  {
    label: "Two-column product grid",
    html: `<table style="width:100%;border-collapse:collapse;margin:16px 0;"><tr><td style="width:50%;padding:8px;vertical-align:top;text-align:center;"><div style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;"><div style="background:#f3f4f6;height:120px;border-radius:6px;margin-bottom:8px;"></div><strong style="font-family:Arial,sans-serif;">Product name</strong><p style="margin:4px 0 0;color:#6b7280;font-size:13px;">€0.00</p></div></td><td style="width:50%;padding:8px;vertical-align:top;text-align:center;"><div style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;"><div style="background:#f3f4f6;height:120px;border-radius:6px;margin-bottom:8px;"></div><strong style="font-family:Arial,sans-serif;">Product name</strong><p style="margin:4px 0 0;color:#6b7280;font-size:13px;">€0.00</p></div></td></tr></table>`,
  },
  {
    label: "Footer",
    html: `<p style="text-align:center;color:#9ca3af;font-size:12px;">© ${new Date().getFullYear()} Your Company. All rights reserved.</p>`,
  },
];

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

export default function EmailEditor({ content, onChange }: Props) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkValue, setLinkValue] = useState("");
  const [mediaOpen, setMediaOpen] = useState(false);
  const [snippetOpen, setSnippetOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [previewWidth, setPreviewWidth] = useState<"desktop" | "mobile">("desktop");
  const editorRef = useRef<Editor | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({ inline: false, allowBase64: false }),
      Link.configure({ openOnClick: false, autolink: true }),
      Placeholder.configure({ placeholder: "Write your email content…" }),
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

  const insertImage = useCallback((asset: MediaAsset) => {
    if (!editor) return;
    editor.chain().focus().setImage({ src: asset.url, alt: asset.altText ?? "" }).run();
  }, [editor]);

  const insertSnippet = useCallback((html: string) => {
    if (!editor) return;
    editor.chain().focus().insertContent(html).run();
    setSnippetOpen(false);
  }, [editor]);

  if (!editor) return null;

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
        <Btn label="B"  active={editor.isActive("bold")}   onClick={() => editor.chain().focus().toggleBold().run()}   title="Bold" />
        <Btn label="I"  active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic" />
        <span className={styles.tbDivider} />

        {/* Blocks */}
        <Btn label="•—" active={editor.isActive("bulletList")}  onClick={() => editor.chain().focus().toggleBulletList().run()}  title="Bullet list" />
        <Btn label="1—" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered list" />
        <Btn label="❝"  active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}  title="Blockquote" />
        <Btn label="—"  active={false}                          onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Divider" />
        <span className={styles.tbDivider} />

        {/* Alignment */}
        <Btn label="≡L" active={editor.isActive({ textAlign: "left" })}   onClick={() => editor.chain().focus().setTextAlign("left").run()}   title="Align left" />
        <Btn label="≡C" active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()} title="Align center" />
        <Btn label="≡R" active={editor.isActive({ textAlign: "right" })}  onClick={() => editor.chain().focus().setTextAlign("right").run()}  title="Align right" />
        <span className={styles.tbDivider} />

        {/* Link */}
        <Btn label="🔗" active={editor.isActive("link")} onClick={openLinkDialog} title="Insert / edit link" />

        {/* Image (via Media Library) */}
        <button
          type="button"
          className={styles.tbBtn}
          title="Insert image"
          onMouseDown={(e) => { e.preventDefault(); setMediaOpen(true); }}
        >
          🖼
        </button>

        {/* Snippet library */}
        <div className={styles.snippetDropdown}>
          <button
            type="button"
            className={styles.tbBtn}
            title="Insert block"
            onMouseDown={(e) => { e.preventDefault(); setSnippetOpen(o => !o); }}
          >
            Insert block ▾
          </button>
          {snippetOpen && (
            <div className={styles.snippetMenu}>
              {SNIPPETS.map(s => (
                <button
                  key={s.label}
                  type="button"
                  className={styles.snippetMenuItem}
                  onMouseDown={(e) => { e.preventDefault(); insertSnippet(s.html); }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* History */}
        <span className={styles.tbDivider} />
        <Btn label="↩" active={false} onClick={() => editor.chain().focus().undo().run()} title="Undo" />
        <Btn label="↪" active={false} onClick={() => editor.chain().focus().redo().run()} title="Redo" />

        <div className={styles.tbSpacer} />

        {/* Preview toggle */}
        <Btn label={previewMode ? "Edit" : "Preview"} active={previewMode} onClick={() => setPreviewMode(p => !p)} title="Toggle preview" />
      </div>

      {/* ── Editor / Preview ── */}
      {previewMode ? (
        <div>
          <div className={styles.previewControls}>
            <button
              type="button"
              className={`${styles.previewWidthBtn} ${previewWidth === "desktop" ? styles.previewWidthBtnActive : ""}`}
              onClick={() => setPreviewWidth("desktop")}
            >
              Desktop
            </button>
            <button
              type="button"
              className={`${styles.previewWidthBtn} ${previewWidth === "mobile" ? styles.previewWidthBtnActive : ""}`}
              onClick={() => setPreviewWidth("mobile")}
            >
              Mobile
            </button>
          </div>
          <div className={styles.previewFrameOuter}>
            <iframe
              title="Email preview"
              srcDoc={content}
              className={styles.previewFrame}
              style={{ width: previewWidth === "mobile" ? 375 : "100%", height: 500 }}
            />
          </div>
        </div>
      ) : (
        <EditorContent editor={editor} />
      )}

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

      {/* ── Media picker ── */}
      <MediaPicker
        open={mediaOpen}
        onClose={() => setMediaOpen(false)}
        onSelect={insertImage}
        mediaType="image"
        title="Insert image"
      />
    </div>
  );
}
