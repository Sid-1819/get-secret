import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { CodeBlock } from "@/components/CodeBlock";
import { Link } from "react-router-dom";
import { BookOpen, Zap, Code2, ArrowRight } from "lucide-react";

const API_BASE = "https://api.getsecret.visionly.dev";

const Docs = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 pt-12 pb-20">
        {/* In-page TOC */}
        <nav className="sticky top-20 z-10 glass rounded-xl p-4 mb-12">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">On this page</p>
          <ul className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <li><a href="#overview" className="text-muted-foreground hover:text-foreground transition-colors">Overview</a></li>
            <li><a href="#quickstart" className="text-muted-foreground hover:text-foreground transition-colors">Quickstart</a></li>
            <li><a href="#api-reference" className="text-muted-foreground hover:text-foreground transition-colors">API Reference</a></li>
            <li><a href="#use-cases" className="text-muted-foreground hover:text-foreground transition-colors">Use cases</a></li>
          </ul>
        </nav>

        {/* Overview */}
        <section id="overview" className="scroll-mt-24 mb-16">
          <div className="glass glow-card rounded-2xl p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-primary-foreground" />
              </div>
              <h2 className="font-display text-xl font-semibold text-foreground">Overview</h2>
            </div>
            <ul className="text-muted-foreground text-sm leading-relaxed space-y-2 list-disc list-inside">
              <li>API-first service for ephemeral, secure secret sharing.</li>
              <li>Create a note via the API, get a unique slug, and share the link.</li>
              <li>Notes can be one-time view, view-limited, or time-limited.</li>
              <li>Optional password protection.</li>
              <li>Built for developers, backend teams, and CI/CD — no account required.</li>
              <li>Web UI available for quick one-off sharing.</li>
              <li>Notes without a passphrase are encrypted on the server at rest. With a passphrase, the web app encrypts content in the browser before upload — the server only stores ciphertext.</li>
              <li>Optional single-file attachment via <code className="font-mono text-foreground">POST /s/multipart</code> (PNG, JPEG, WebP, PDF, plain text; max 1 MB).</li>
              <li>REST over JSON (and multipart for uploads). Base URL for examples: <code className="px-1.5 py-0.5 rounded bg-muted text-foreground font-mono text-xs">{API_BASE}</code> (replace with your deployment when applicable).</li>
            </ul>
          </div>
        </section>

        {/* Quickstart */}
        <section id="quickstart" className="scroll-mt-24 mb-16">
          <h2 className="font-display text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
            <Zap className="w-6 h-6 text-primary" />
            Quickstart
          </h2>

          <div className="space-y-14">
            <div className="glass glow-card rounded-2xl p-6 sm:p-8">
              <h3 className="font-display font-semibold text-foreground mb-3">Create a note</h3>
              <p className="text-muted-foreground text-sm mb-4">
                <code className="font-mono text-foreground">POST /s</code> — returns <code className="font-mono text-foreground">slug</code>, <code className="font-mono text-foreground">expiresAt</code>, <code className="font-mono text-foreground">maxViews</code>. Build the share link on your frontend: <code className="font-mono text-foreground">{"${origin}/s/${slug}"}</code>.
              </p>
              <ul className="text-muted-foreground text-sm space-y-1 mb-5 list-disc list-inside">
                <li>Body: <code className="font-mono text-foreground">content</code> (required), <code className="font-mono text-foreground">expiresAt</code>, <code className="font-mono text-foreground">maxViews</code>, <code className="font-mono text-foreground">password</code> (optional).</li>
              </ul>
              <CodeBlock
                code={`curl -X POST ${API_BASE}/s \\
  -H "Content-Type: application/json" \\
  -d '{"content":"my secret","maxViews":1,"expiresAt":"2026-12-31T23:59:59Z"}'`}
              />
            </div>

            <div className="glass glow-card rounded-2xl p-6 sm:p-8">
              <h3 className="font-display font-semibold text-foreground mb-3">Read a note</h3>
              <p className="text-muted-foreground text-sm mb-4">
                <code className="font-mono text-foreground">GET /s/:slug</code> — returns <code className="font-mono text-foreground">payloadMode</code>, <code className="font-mono text-foreground">content</code>, and optional <code className="font-mono text-foreground">attachment</code> <code className="font-mono text-foreground">{"{ mimeType, originalName, data }"}</code>. One view is consumed only when a successful response (200) is returned; at max views the note is deleted.
              </p>
              <ul className="text-muted-foreground text-sm space-y-1 mb-5 list-disc list-inside">
                <li>Password-protected? Send header <code className="font-mono text-foreground">X-Secret-Password</code>.</li>
              </ul>
              <div className="space-y-5">
                <div>
                  <p className="text-xs font-medium text-foreground mb-2">Without password</p>
                  <CodeBlock code={`curl "${API_BASE}/s/your-slug"`} />
                </div>
                <div>
                  <p className="text-xs font-medium text-foreground mb-2">With password</p>
                  <CodeBlock code={`curl -H "X-Secret-Password: your-passphrase" "${API_BASE}/s/your-slug"`} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* API Reference */}
        <section id="api-reference" className="scroll-mt-24 mb-16">
          <h2 className="font-display text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
            <Code2 className="w-6 h-6 text-primary" />
            API Reference
          </h2>

          <div className="space-y-10">
            <div className="glass glow-card rounded-2xl p-6 sm:p-8">
              <h3 className="font-display font-semibold text-foreground mb-1">POST /s — Create note</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Creates an ephemeral note. Returns slug, expiresAt, and maxViews.
              </p>
              <p className="text-xs font-medium text-foreground mb-2">Request body (JSON)</p>
              <ul className="text-sm text-muted-foreground space-y-1 mb-4 list-disc list-inside">
                <li><code className="text-foreground">content</code> (string, required) — Max 1 MB. With <code className="text-foreground">password</code>, must be client-side ciphertext JSON (see web app); without password, plaintext (server encrypts).</li>
                <li><code className="text-foreground">expiresAt</code> (string, optional) — ISO 8601, must be a future date.</li>
                <li><code className="text-foreground">maxViews</code> (number, optional) — 1–1000. Defaults to 1 if omitted.</li>
                <li><code className="text-foreground">password</code> (string, optional) — 8–128 chars; must include lower, upper, digit, and symbol.</li>
              </ul>
              <p className="text-xs font-medium text-foreground mb-2 mt-4">POST /s/multipart — Create with attachment</p>
              <p className="text-sm text-muted-foreground mb-2">
                <code className="text-foreground">multipart/form-data</code> fields: same as JSON <code className="text-foreground">content</code>, <code className="text-foreground">expiresAt</code>, <code className="text-foreground">maxViews</code>, <code className="text-foreground">password</code>, plus optional file field <code className="text-foreground">file</code>. With passphrase + file, also send <code className="text-foreground">attachmentMimeType</code> and <code className="text-foreground">attachmentFileName</code> for the original file (the uploaded bytes may be client-encrypted).
              </p>
              <p className="text-xs font-medium text-foreground mb-2">Response</p>
              <p className="text-sm text-muted-foreground mb-2">201 — <code className="text-foreground">{"{ \"slug\", \"expiresAt\", \"maxViews\" }"}</code></p>
              <CodeBlock
                code={`{
  "slug": "abc123",
  "expiresAt": "2026-12-31T23:59:59Z",
  "maxViews": 1
}`}
              />
              <p className="text-xs font-medium text-foreground mb-2 mt-4">Errors</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>400 — Validation error (invalid or missing fields).</li>
                <li>429 — Rate limit exceeded (3 creates per minute, 10 per 24 hours per client).</li>
              </ul>
            </div>

            <div className="glass glow-card rounded-2xl p-6 sm:p-8">
              <h3 className="font-display font-semibold text-foreground mb-1">GET /s/:slug — Read note</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Returns the note content. One view is consumed only when a successful response (200 with content) is returned; when the maximum view limit is reached, the note is permanently deleted. Password-protected notes require the header.
              </p>
              <p className="text-xs font-medium text-foreground mb-2">Headers</p>
              <ul className="text-sm text-muted-foreground space-y-1 mb-4">
                <li><code className="text-foreground">X-Secret-Password</code> (optional) — Passphrase if the note is protected.</li>
              </ul>
              <p className="text-xs font-medium text-foreground mb-2">Response</p>
              <p className="text-sm text-muted-foreground mb-2">200 — <code className="text-foreground">{"{ \"payloadMode\": \"SERVER_ENCRYPTED\" | \"CLIENT_CIPHERTEXT\", \"content\": \"string\", \"attachment\": null | { \"mimeType\", \"originalName\", \"data\" } }"}</code>. Response includes <code className="text-foreground">Cache-Control: no-store</code>.</p>
              <p className="text-xs font-medium text-foreground mb-2">Errors</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>403 — <code className="text-foreground">code</code>: <code className="text-foreground">PASSWORD_REQUIRED</code> (send <code className="text-foreground">X-Secret-Password</code>), <code className="text-foreground">INVALID_PASSWORD</code>, or <code className="text-foreground">WRONG_PASSWORD_LIMIT</code> (too many wrong attempts).</li>
                <li>404 — Note not found, already consumed, or expired.</li>
                <li>429 — Too many requests.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Use cases */}
        <section id="use-cases" className="scroll-mt-24 mb-16">
          <h2 className="font-display text-2xl font-bold text-foreground mb-6">Use cases</h2>
          <div className="glass glow-card rounded-2xl p-6 sm:p-8 space-y-4">
            <p className="text-muted-foreground text-sm"><strong className="text-foreground">CI/CD secrets:</strong> Emit a one-time secret from a pipeline and consume it in another step or system.</p>
            <p className="text-muted-foreground text-sm"><strong className="text-foreground">Backend and internal tools:</strong> Generate time-limited or one-time tokens for handoffs between services or support flows.</p>
            <p className="text-muted-foreground text-sm"><strong className="text-foreground">One-time tokens:</strong> Share credentials or links that must be used once and then disappear.</p>
            <p className="text-muted-foreground text-sm"><strong className="text-foreground">Support and ops:</strong> Send a temporary secret to a colleague or customer; they open the link and the content is gone after viewing.</p>
          </div>
        </section>

        {/* CTA */}
        <div className="text-center">
          <Button variant="hero" size="lg" asChild>
            <Link to="/">
              Create a note in the web UI
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </Button>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Docs;
