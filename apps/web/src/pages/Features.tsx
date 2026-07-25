import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  Shield, Lock, Eye, Globe, Timer, Key,
  ArrowRight, CheckCircle2, ShieldCheck, Link2,
} from "lucide-react";

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

const mainFeatures = [
  {
    icon: Globe,
    title: "Automation & backends",
    desc: "Create and consume one-time secret links from your services, CI jobs, and scripts — same security model as the web handoff, without manual copy-paste.",
    details: ["REST-friendly flows", "Works with any stack", "Ideal for runbooks and pipelines"],
    linkTo: "/docs" as const,
  },
  {
    icon: Lock,
    title: "Ciphertext only at rest",
    desc: "Secrets are protected in transit (HTTPS) and stored as encrypted blobs. We do not persist your payload in plain text.",
    details: ["TLS to the API and web UI", "No plaintext on disk", "You control who receives the link"],
  },
  {
    icon: Eye,
    title: "One-time or capped disclosure",
    desc: "Open the link and the secret is revealed within the limits you set — then the ciphertext is removed. No inbox history, no long-lived copy in chat.",
    details: ["Single-use or limited views", "Time-boxed TTL", "Automatic purge after consumption"],
  },
  {
    icon: Shield,
    title: "AES-256-GCM at rest",
    desc: "Payloads are encrypted at rest with modern AEAD. Designed so a casual “note app” is not what you are trusting — a secret handoff channel is.",
    details: ["Industry-standard algorithms", "No voyeur analytics on content", "Privacy-first defaults"],
  },
  {
    icon: Timer,
    title: "You set the blast radius",
    desc: "Tight expiry and low view counts shrink the window where a leaked URL still matters. Defaults favor short-lived secrets, not permanent pages.",
    details: ["Short TTL presets", "Expiry + view limits together", "Predictable lifecycle"],
  },
  {
    icon: Key,
    title: "Optional passphrase",
    desc: "Add a strong passphrase so possession of the URL alone is not enough. Share the link and the secret out-of-band for defense in depth.",
    details: ["Optional on any link", "Unlock before reveal", "Rate-limited guess attempts per link"],
  },
];

const howItWorks = [
  {
    step: "01",
    title: "Seal the payload",
    desc: "Paste credentials, keys, or sensitive text. We store ciphertext only — never plain text on disk.",
    icon: Lock,
  },
  {
    step: "02",
    title: "Send one link",
    desc: "Share a single URL with view limits and expiry — not the raw secret in email or Slack.",
    icon: Link2,
  },
  {
    step: "03",
    title: "Gone for good",
    desc: "After the last allowed view or when time runs out, the secret is deleted. No archive, no recovery.",
    icon: ShieldCheck,
  },
];

const Features = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <motion.div
          className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-16 sm:pt-28 sm:pb-20 text-center"
          initial="initial"
          animate="animate"
          variants={stagger}
        >
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-sm text-muted-foreground mb-6 border border-primary/15"
            variants={fadeUp}
          >
            <Shield className="w-3.5 h-3.5 text-primary shrink-0" />
            One-time links · encrypted at rest
          </motion.div>
          <motion.h1
            className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-5"
            variants={fadeUp}
          >
            Built for <span className="text-primary">secret handoffs</span>
          </motion.h1>
          <motion.p
            className="text-lg sm:text-xl text-muted-foreground max-w-xl mx-auto"
            variants={fadeUp}
          >
            Every capability exists to move passwords, keys, and confidential payloads through a short-lived, encrypted channel — not to host permanent “notes.”
          </motion.p>
        </motion.div>
      </section>

      {/* How it works */}
      <section className="border-y border-border bg-card/30 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground text-center mb-14">
            How secret sharing works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {howItWorks.map((item, i) => (
              <motion.div
                key={item.step}
                className="relative text-center group"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.35, delay: i * 0.1 }}
                whileHover={{ y: -4 }}
              >
                {i < howItWorks.length - 1 && (
                  <div className="hidden md:block absolute top-12 left-[60%] w-[80%] h-px border-t border-dashed border-border" />
                )}
                <motion.div
                  className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform duration-300"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <item.icon className="w-7 h-7 text-primary-foreground" />
                </motion.div>
                <div className="text-xs font-bold text-foreground mb-2 font-display">{item.step}</div>
                <h3 className="font-display font-semibold text-foreground text-lg mb-2">{item.title}</h3>
                <p className="text-muted-foreground text-sm">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
        <motion.div
          className="text-center mb-14"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.4 }}
        >
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Everything for safer disclosure
          </h2>
          <p className="text-muted-foreground text-lg max-w-lg mx-auto">
            Strong defaults for ephemeral secrets — without turning your team into cryptographers.
          </p>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mainFeatures.map((f, i) => (
            <motion.div
              key={f.title}
              className="glass glow-card rounded-2xl p-6 sm:p-8 group"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.35, delay: i * 0.06 }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
            >
              <motion.div
                className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.98 }}
              >
                <f.icon className="w-6 h-6 text-primary-foreground" />
              </motion.div>
              <h3 className="font-display font-semibold text-foreground text-lg mb-2">{f.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed mb-4">{f.desc}</p>
              <ul className="space-y-1.5">
                {f.details.map((d) => (
                  <li key={d} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                    {d}
                  </li>
                ))}
              </ul>
              {/* {"linkTo" in f && f.linkTo && (
                <Button variant="outline" size="sm" className="mt-4" asChild>
                  <Link to={f.linkTo}>View docs</Link>
                </Button>
              )} */}
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <motion.section
        className="relative overflow-hidden"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.45 }}
      >
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-20 text-center">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Ready to try it?
          </h2>
          <p className="text-muted-foreground text-lg max-w-md mx-auto mb-8">
            No account required. Seal a one-time secret link from the home page in seconds.
          </p>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button variant="hero" size="xl" asChild>
              <Link to="/#create">
                Create a secret link
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </motion.section>

      <Footer />
    </div>
  );
};

export default Features;
