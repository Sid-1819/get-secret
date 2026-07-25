import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Key, Paperclip, Mail, Terminal, KeyRound, Webhook, Users, MapPin, Shield } from "lucide-react";

const availableNow = [
  { icon: Key, title: "Password-protected notes" },
];

const comingSoon = [
  { icon: Paperclip, title: "File attachments" },
  { icon: Mail, title: "Email notifications" },
  { icon: Terminal, title: "CLI tool" },
];

const future = [
  { icon: Shield, title: "Client-side encryption (zero-knowledge)" },
  { icon: KeyRound, title: "API keys" },
  { icon: Webhook, title: "Webhooks" },
  { icon: Users, title: "Workspace sharing" },
];

function RoadmapSection({
  heading,
  badge,
  items,
}: {
  heading: string;
  badge: string;
  items: { icon: typeof Key; title: string }[];
}) {
  return (
    <div className="mb-12">
      <div className="flex items-center gap-3 mb-6">
        <h2 className="font-display text-xl font-semibold text-foreground">{heading}</h2>
        <span className="text-xs font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded">
          {badge}
        </span>
      </div>
      <ul className="space-y-4">
        {items.map((item) => (
          <li
            key={item.title}
            className="glass glow-card rounded-2xl p-5 sm:p-6 flex items-center gap-4"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <item.icon className="w-5 h-5 text-primary" />
            </div>
            <span className="font-display font-medium text-foreground">{item.title}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const Roadmap = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <section className="relative overflow-hidden flex-1">
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 pt-20 pb-16 sm:pt-28 sm:pb-24">
          <div className="flex items-center gap-2 text-muted-foreground mb-4">
            <MapPin className="w-4 h-4" />
            <span className="text-sm font-medium">What we're building</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-4">
            Roadmap
          </h1>
          <p className="text-muted-foreground text-lg mb-12">
            Shipped, coming soon, and on the horizon.
          </p>

          <RoadmapSection
            heading="Available now"
            badge="Live"
            items={availableNow}
          />
          <RoadmapSection
            heading="Coming soon"
            badge="In progress"
            items={comingSoon}
          />
          <RoadmapSection
            heading="Future"
            badge="Planned"
            items={future}
          />
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Roadmap;
