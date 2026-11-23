"use client";

import { Placeholder } from "@tiptap/extensions";
import { Markdown } from "@tiptap/markdown";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Table,
  TableCell,
  TableHeader,
  TableRow,
} from "@tiptap/extension-table";
import {
  Bold,
  Columns3,
  Italic,
  Link2,
  Redo2,
  Rows3,
  Strikethrough,
  Table2,
  Trash2,
  Undo2,
} from "lucide-react";
import { useState } from "react";

const NO_FORMAT = {
  bold: false,
  italic: false,
  strike: false,
  style: "p",
  link: false,
  inTable: false,
  canUndo: false,
  canRedo: false,
};

const STYLES = [
  { id: "p", label: "Paragraf" },
  { id: "h2", label: "Büyük başlık" },
  { id: "h3", label: "Küçük başlık" },
  { id: "quote", label: "Alıntı" },
  { id: "bullet", label: "Madde işaretli liste" },

  { id: "ordered", label: "Numaralı liste" },
];

function Btn({
  on,
  active,
  label,
  children,
}: {
  on: () => void;
  active: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    // onMouseDown: düğmeye basınca yazı alanının odağı ve seçimi kaybolmasın
    <button
      type="button"
      className={`tb ${active ? "on" : ""}`}
      aria-pressed={active}
      aria-label={label}
      title={label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={on}
    >
      {children}
    </button>
  );
}

/**
 * Basit biçimlendirme çubuklu metin editörü. İçerik Markdown olarak saklanır, yani site ve
 * eski yazılar aynı şekilde çalışır. Değerin dışarıdan değişmesi gerekirse yeni bir `key` verilmeli.
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
        code: false,
        codeBlock: false,
        horizontalRule: false,
        link: { openOnClick: false, autolink: true },
      }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      Markdown,
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    contentType: "markdown",
    onUpdate: ({ editor }) => onChange(editor.getMarkdown()),
    editorProps: {
      attributes: { class: "rich-input", "aria-label": "Yazı alanı" },
    },
  });

  const state =
    useEditorState({
      editor,
      selector: ({ editor }) => ({
        bold: editor?.isActive("bold") ?? false,
        italic: editor?.isActive("italic") ?? false,
        strike: editor?.isActive("strike") ?? false,
        style: !editor
          ? "p"
          : editor.isActive("heading", { level: 2 })
            ? "h2"
            : editor.isActive("heading", { level: 3 })
              ? "h3"
              : editor.isActive("blockquote")
                ? "quote"
                : editor.isActive("bulletList")
                  ? "bullet"
                  : editor.isActive("orderedList")
                    ? "ordered"
                    : "p",
        link: editor?.isActive("link") ?? false,
        inTable: editor?.isActive("table") ?? false,
        canUndo: editor?.can().undo() ?? false,
        canRedo: editor?.can().redo() ?? false,
      }),
    }) ?? NO_FORMAT;

  if (!editor)
    return (
      <div className="rich muted small" style={{ padding: 12 }}>
        Editör yükleniyor…
      </div>
    );

  const run = () => editor.chain().focus();

  function applyStyle(id: string) {
    // Önce bulunduğu biçimi (liste, alıntı, başlık) temizle, sonra isteneni uygula.
    const c = run().clearNodes();
    if (id === "h2") c.setHeading({ level: 2 }).run();
    else if (id === "h3") c.setHeading({ level: 3 }).run();
    else if (id === "quote") c.setBlockquote().run();
    else if (id === "bullet") c.toggleBulletList().run();
    else if (id === "ordered") c.toggleOrderedList().run();
    else c.run();
  }

  function applyLink() {
    const url = linkUrl.trim();
    if (!url) run().extendMarkRange("link").unsetLink().run();
    else
      run()
        .extendMarkRange("link")
        .setLink({
          href: /^(https?:|mailto:|\/)/.test(url) ? url : `https://${url}`,
        })
        .run();
    setLinkOpen(false);
  }

  return (
    <div className="rich">
      <div className="rich-bar" role="toolbar" aria-label="Biçimlendirme">
        <button
          type="button"
          className="tb"
          aria-label="Geri al (Ctrl+Z)"
          title="Geri al (Ctrl+Z)"
          disabled={!state.canUndo}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => run().undo().run()}
        >
          <Undo2 size={15} />
        </button>
        <button
          type="button"
          className="tb"
          aria-label="Yinele (Ctrl+Shift+Z)"
          title="Yinele (Ctrl+Shift+Z)"
          disabled={!state.canRedo}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => run().redo().run()}
        >
          <Redo2 size={15} />
        </button>
        <span className="sep" />
        <select
          className="tb-select"
          aria-label="Metin stili"
          value={state.style}
          onChange={(e) => applyStyle(e.target.value)}
        >
          {STYLES.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
        <span className="sep" />
        <Btn
          on={() => run().toggleBold().run()}
          active={state.bold}
          label="Kalın (Ctrl+B)"
        >
          <Bold size={15} />
        </Btn>
        <Btn
          on={() => run().toggleItalic().run()}
          active={state.italic}
          label="İtalik (Ctrl+I)"
        >
          <Italic size={15} />
        </Btn>
        <Btn
          on={() => run().toggleStrike().run()}
          active={state.strike}
          label="Üstü çizili"
        >
          <Strikethrough size={15} />
        </Btn>
        <span className="sep" />
        <Btn
          on={() => {
            setLinkUrl(editor.getAttributes("link").href ?? "");
            setLinkOpen((o) => !o);
          }}
          active={state.link}
          label="Bağlantı ekle veya düzenle"
        >
          <Link2 size={16} />
        </Btn>
        <span className="sep" />
        <Btn
          on={() =>
            run().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
          }
          active={state.inTable}
          label="Tablo ekle (3×3)"
        >
          <Table2 size={16} />
        </Btn>
        {state.inTable && (
          <>
            <Btn
              on={() => run().addRowAfter().run()}
              active={false}
              label="Alta satır ekle"
            >
              <Rows3 size={16} />
            </Btn>
            <Btn
              on={() => run().addColumnAfter().run()}
              active={false}
              label="Sağa sütun ekle"
            >
              <Columns3 size={16} />
            </Btn>
            <Btn
              on={() => run().deleteTable().run()}
              active={false}
              label="Tabloyu sil"
            >
              <Trash2 size={15} />
            </Btn>
          </>
        )}
      </div>
      {linkOpen && (
        <form
          className="rich-link"
          onSubmit={(e) => {
            e.preventDefault();
            applyLink();
          }}
        >
          <input
            autoFocus
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://… (boş bırakıp onaylarsan bağlantı kalkar)"
            aria-label="Bağlantı adresi"
          />
          <button className="btn small primary">Tamam</button>
          <button
            type="button"
            className="btn small"
            onClick={() => setLinkOpen(false)}
          >
            Vazgeç
          </button>
        </form>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}
