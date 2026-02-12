import { useRef, useState } from "react";

type RichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export function RichTextEditor({ value, onChange, placeholder = "Enter content..." }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [showToolbar, setShowToolbar] = useState(false);

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    updateContent();
  };

  const updateContent = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  return (
    <div className="space-y-2">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 p-2 rounded-lg border-2 border-creamDark bg-white">
        <button
          type="button"
          onClick={() => execCommand("bold")}
          className="px-3 py-1.5 rounded text-sm font-semibold border border-creamDark hover:bg-cream"
          title="Bold"
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          onClick={() => execCommand("italic")}
          className="px-3 py-1.5 rounded text-sm italic border border-creamDark hover:bg-cream"
          title="Italic"
        >
          <em>I</em>
        </button>
        <button
          type="button"
          onClick={() => execCommand("underline")}
          className="px-3 py-1.5 rounded text-sm underline border border-creamDark hover:bg-cream"
          title="Underline"
        >
          <u>U</u>
        </button>
        <div className="w-px h-6 bg-creamDark mx-1" />
        <button
          type="button"
          onClick={() => execCommand("formatBlock", "h2")}
          className="px-3 py-1.5 rounded text-sm border border-creamDark hover:bg-cream"
          title="Heading"
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => execCommand("formatBlock", "h3")}
          className="px-3 py-1.5 rounded text-sm border border-creamDark hover:bg-cream"
          title="Subheading"
        >
          H3
        </button>
        <button
          type="button"
          onClick={() => execCommand("formatBlock", "p")}
          className="px-3 py-1.5 rounded text-sm border border-creamDark hover:bg-cream"
          title="Paragraph"
        >
          P
        </button>
        <div className="w-px h-6 bg-creamDark mx-1" />
        <button
          type="button"
          onClick={() => execCommand("insertUnorderedList")}
          className="px-3 py-1.5 rounded text-sm border border-creamDark hover:bg-cream"
          title="Bullet List"
        >
          •
        </button>
        <button
          type="button"
          onClick={() => execCommand("insertOrderedList")}
          className="px-3 py-1.5 rounded text-sm border border-creamDark hover:bg-cream"
          title="Numbered List"
        >
          1.
        </button>
        <div className="w-px h-6 bg-creamDark mx-1" />
        <button
          type="button"
          onClick={() => {
            const url = prompt("Enter URL:");
            if (url) execCommand("createLink", url);
          }}
          className="px-3 py-1.5 rounded text-sm border border-creamDark hover:bg-cream"
          title="Insert Link"
        >
          🔗
        </button>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        onInput={updateContent}
        onBlur={updateContent}
        className="w-full min-h-[200px] rounded-xl border-2 border-creamDark bg-white px-4 py-3 text-base text-textDark outline-none focus:border-gold"
        style={{ whiteSpace: "pre-wrap" }}
        dangerouslySetInnerHTML={{ __html: value || "" }}
        data-placeholder={placeholder}
      />
      <style>{`
        [contenteditable][data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: #999;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}
