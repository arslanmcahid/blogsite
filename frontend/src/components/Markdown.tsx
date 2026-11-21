import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// react-markdown ham HTML'e izin vermez, bu yüzden XSS açısından güvenlidir.
export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}
