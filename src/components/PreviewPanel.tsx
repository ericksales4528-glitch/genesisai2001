interface Props {
  html: string;
  domain: string;
  title: string;
}

export default function PreviewPanel({ html, domain, title }: Props) {
  return (
    <div className="sticky top-5 flex flex-col overflow-hidden rounded-xl border border-border bg-muted shadow-inner" style={{ height: "calc(100vh - 40px)" }}>
      <div className="flex items-center gap-2 border-b border-border bg-card p-3">
        <div className="flex gap-1.5">
          <div className="h-3 w-3 rounded-full bg-destructive/60" />
          <div className="h-3 w-3 rounded-full bg-yellow-400" />
          <div className="h-3 w-3 rounded-full bg-emerald-400" />
        </div>
        <div className="mx-auto w-1/2 truncate rounded bg-muted px-4 py-1 text-center text-xs text-muted-foreground">
          {domain || "www.empresa.com.br"}
        </div>
      </div>

      <iframe
        srcDoc={html}
        className="w-full flex-grow bg-card"
        title={title || "Preview do site"}
        sandbox="allow-same-origin"
      />
    </div>
  );
}
