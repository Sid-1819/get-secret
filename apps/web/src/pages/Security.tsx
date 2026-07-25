import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Lock, Trash2, SearchX, Fingerprint } from "lucide-react";

const sections = [
  {
    icon: Lock,
    title: "Encryption at rest",
    content:
      "Secret payloads are encrypted in transit (HTTPS) and at rest. We do not keep plaintext on disk — only encrypted material until the link is consumed or expires. Optional passphrases add another gate before reveal.",
  },
  {
    icon: Trash2,
    title: "Automatic deletion",
    content:
      "Encrypted payloads are removed after they are consumed (per your view limits) or when they expire. We do not retain copies for browsing or “version history.” By design there is no long-term archive of the secret itself.",
  },
  {
    icon: SearchX,
    title: "No search engine indexing",
    content:
      "Pages that reveal a secret are excluded from search engine indexing. We use noindex directives so one-time URLs are not meant to surface in public search results.",
  },
  {
    icon: Fingerprint,
    title: "Minimal logging",
    content:
      "We log only what is necessary for reliability and abuse prevention. We do not log secret body content, and we avoid collecting personal data beyond what operating a secure handoff requires.",
  },
];

const Security = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <section className="relative overflow-hidden flex-1">
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 pt-20 pb-16 sm:pt-28 sm:pb-24">
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-4">
            Security &amp; Privacy
          </h1>
          <p className="text-muted-foreground text-lg mb-12">
            How we protect one-time secret handoffs and keep collected data to a minimum.
          </p>

          <div className="space-y-10">
            {sections.map((s) => (
              <div
                key={s.title}
                className="glass glow-card rounded-2xl p-6 sm:p-8 group hover:transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shrink-0">
                    <s.icon className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div>
                    <h2 className="font-display font-semibold text-foreground text-lg mb-2">
                      {s.title}
                    </h2>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {s.content}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Security;
