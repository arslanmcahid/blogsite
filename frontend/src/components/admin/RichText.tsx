"use client";

import { Placeholder } from "@tiptap/extensions";
import { Markdown } from "@tiptap/markdown";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useState } from "react";

const NO_FORMAT = { bold: false, italic: false, h2: false, h3: false, bullet: false, ordered: false, quote: false, link: false };

function Btn({ on, active, label, title, children }: { on: () => void; active: boolean; label: string; title: string; children: React.ReactNode }) {
  return (
    // onMouseDown: düğmeye basınca yazı alanının odağı ve seçimi kaybolmasın
    <button type="button" className={`tb ${active ? "on" : ""}`} aria-pressed={active} aria-label={label} title={title} onMouseDown={(e) => e.preventDefault()} onClick={on}>
      {children}
    </button>
  );
}

/**
 * Word benzeri metin editörü. İçerik Markdown olarak saklanır, yani site ve eski
 * yazılar aynı şekilde çalışır; ama yazarken Markdown bilmek gerekmez.
 * Değerin dışarıdan değişmesi gerekirse bileşene yeni bir `key` verilmeli.
 */
export function RichText({
  value,
  onChange,
  placeholder = "Yazmaya başla…",
}: {
  value: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
}) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  const editor = useEditor({
    immediatelyRender: false, // sunucu tarafı render ile uyumsuzluğu önler
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        // Markdown'da karşılığı olmayan veya siteye yansımayacak özellikleri kapat
        underline: false,
        strike: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
        link: { openOnClick: false, autolink: true },
      }),
      Markdown,
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    contentType: "markdown",
    onUpdate: ({ editor }) => onChange(editor.getMarkdown()),
    editorProps: { attributes: { class: "rich-input prose", "aria-label": "Yazı alanı" } },
  });

  const state =
    useEditorState({
    editor,
    selector: ({ editor }) => ({
      bold: editor?.isActive("bold") ?? false,
      italic: editor?.isActive("italic") ?? false,
      h2: editor?.isActive("heading", { level: 2 }) ?? false,
      h3: editor?.isActive("heading", { level: 3 }) ?? false,
      bullet: editor?.isActive("bulletList") ?? false,
      ordered: editor?.isActive("orderedList") ?? false,
      quote: editor?.isActive("blockquote") ?? false,
      link: editor?.isActive("link") ?? false,
    }),
  }) ?? NO_FORMAT;

  if (!editor) return <div className="rich muted small">Editör yükleniyor…</div>;

  const run = () => editor.chain().focus();

  function applyLink() {
    const url = linkUrl.trim();
    if (!url) run().extendMarkRange("link").unsetLink().run();
    else run().extendMarkRange("link").setLink({ href: /^(https?:|mailto:|\/)/.test(url) ? url : `https://${url}` }).run();
    setLinkOpen(false);
  }

  return (
    <div className="rich">
      <div className="rich-bar" role="toolbar" aria-label="Biçimlendirme">
        <Btn on={() => run().toggleBold().run()} active={state.bold} label="Kalın" title="Kalın (Ctrl+B)"><b>K</b></Btn>
        <Btn on={() => run().toggleItalic().run()} active={state.italic} label="İtalik" title="İtalik (Ctrl+I)"><i>İ</i></Btn>
        <span className="sep" />
        <Btn on={() => run().toggleHeading({ level: 2 }).run()} active={state.h2} label="Başlık" title="Büyük başlık">Başlık</Btn>
        <Btn on={() => run().toggleHeading({ level: 3 }).run()} active={state.h3} label="Alt başlık" title="Küçük başlık">Alt başlık</Btn>
        <span className="sep" />
        <Btn on={() => run().toggleBulletList().run()} active={state.bullet} label="Madde işaretli liste" title="Madde işaretli liste">• Liste</Btn>
        <Btn on={() => run().toggleOrderedList().run()} active={state.ordered} label="Numaralı liste" title="Numaralı liste">1. Liste</Btn>
        <Btn on={() => run().toggleBlockquote().run()} active={state.quote} label="Girintili alıntı" title="Girintili alıntı">❝</Btn>
        <span className="sep" />
        <Btn
          on={() => {
            setLinkUrl(editor.getAttributes("link").href ?? "");
            setLinkOpen((o) => !o);
          }}
          active={state.link}
          label="Bağlantı ekle"
          title="Bağlantı ekle veya düzenle"
        >
          🔗 Bağlantı
        </Btn>
      </div>
      {linkOpen && (
        <form
          className="rich-link"
          onSubmit={(e) => {
            e.preventDefault();
            applyLink();
          }}
        >
          <input autoFocus value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://… (boş bırakıp onaylarsan bağlantı kalkar)" aria-label="Bağlantı adresi" />
          <button className="btn small primary">Tamam</button>
          <button type="button" className="btn small" onClick={() => setLinkOpen(false)}>Vazgeç</button>
        </form>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}
