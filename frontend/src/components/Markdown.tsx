import ReactMarkdown from "react-markdown";

// react-markdown ham HTML'e izin vermez, bu yüzden XSS açısından güvenlidir.
export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose">
      <ReactMarkdown>{children}</ReactMarkdown>
    </div>
  );
}
