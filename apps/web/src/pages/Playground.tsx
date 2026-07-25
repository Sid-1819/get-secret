import { useMemo, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { buildShareUrl, secretClient } from "@/lib/api";

const DEFAULT_WEB_ORIGIN =
  typeof window !== "undefined" ? window.location.origin : "https://getsecret.visionly.dev";

export default function Playground() {
  const [content, setContent] = useState("Hello from @getsecret/web playground");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const apiHint = useMemo(() => {
    const base = import.meta.env.VITE_API_URL;
    return base && String(base).trim() !== "" ? String(base) : "same-origin /s proxy (dev)";
  }, []);

  const handleCreate = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await secretClient.createNote({ content });
      const shareUrl = buildShareUrl(DEFAULT_WEB_ORIGIN, res.slug);
      setResult(JSON.stringify({ ...res, shareUrl }, null, 2));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-12">
        <h1 className="font-display text-2xl font-bold text-foreground mb-2">SDK Playground</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Uses <code className="font-mono text-foreground">@getsecret/sdk</code> via workspace.
          Requests go to <code className="font-mono text-foreground">{apiHint}</code>.
        </p>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          className="mb-4 font-mono text-sm"
        />
        <Button onClick={handleCreate} disabled={loading || !content.trim()}>
          {loading ? "Creating…" : "Create secret"}
        </Button>
        {error && (
          <pre className="mt-6 p-4 rounded-lg bg-destructive/10 text-destructive text-sm overflow-auto">
            {error}
          </pre>
        )}
        {result && (
          <pre className="mt-6 p-4 rounded-lg bg-muted text-foreground text-sm overflow-auto">
            {result}
          </pre>
        )}
      </main>
      <Footer />
    </div>
  );
}
