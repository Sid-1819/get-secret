import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { FeedbackSideTab } from "@/components/FeedbackSideTab";
import { Footer } from "@/components/Footer";
import { NoteForm } from "@/components/NoteForm";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  Shield, Lock, ArrowRight, Trash2, UserX, ShieldCheck, Link2,
} from "lucide-react";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
};

const stagger = {
  animate: {
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const trustSignals = [
  { icon: Lock, label: "AES-256-GCM at rest" },
  { icon: UserX, label: "No accounts · no inbox" },
  { icon: Trash2, label: "Purged after access or TTL" },
];

const howItWorksSteps = [
  {
    step: "01",
    title: "Seal the payload",
    desc: "Paste credentials, API keys, or any sensitive text. We store ciphertext only — never plain text on disk.",
    icon: Lock,
  },
  {
    step: "02",
    title: "Send one link",
    desc: "Share a single URL with view limits and expiry. No Slack or email trail carrying the secret itself.",
    icon: Link2,
  },
  {
    step: "03",
    title: "Gone for good",
    desc: "After the last allowed view or when time runs out, the secret is deleted. No archive, no recovery.",
    icon: ShieldCheck,
  },
];

// Feature cards commented out; CTA to /features used instead
// const features = [
//   { icon: Shield, title: "Encrypted in transit and at rest", desc: "..." },
//   { icon: Eye, title: "Self-destructing", desc: "..." },
//   { icon: Lock, title: "Private by design", desc: "..." },
// ];

const valueBullets = [
  { icon: UserX, label: "No signup" },
  { icon: Lock, label: "Encrypted payloads" },
  { icon: Shield, label: "Built for secrets" },
  { icon: Trash2, label: "Self-destructing links" },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <FeedbackSideTab />
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Animated background */}
        <div className="hero-bg" aria-hidden>
          <div className="hero-bg-grid" />
          <div className="hero-bg-secure-vignette" />
          <div className="hero-bg-orb hero-bg-orb-1" />
          <div className="hero-bg-orb hero-bg-orb-2" />
          <div className="hero-bg-orb hero-bg-orb-3" />
        </div>
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-24 sm:pt-28 sm:pb-32">
          <motion.div
            className="text-center max-w-3xl mx-auto mb-12"
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
              className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight font-display mb-5"
              variants={fadeUp}
            >
              Hand off sensitive data once —{" "}
              <span className="text-primary">then it is gone</span>
            </motion.h1>
            <motion.p
              className="text-lg sm:text-xl text-muted-foreground max-w-xl mx-auto mb-8 leading-relaxed"
              variants={fadeUp}
            >
              Purpose-built for passwords, recovery codes, keys, and confidential payloads. Use the REST API from CI and backends, or seal a secret below in seconds — no accounts and no long-lived storage of plain text.
            </motion.p>
            <motion.div
              className="flex flex-col sm:flex-row items-center justify-center gap-3"
              variants={fadeUp}
            >
              <Button variant="hero" size="xl" asChild>
                <Link to="/features">
                  Explore features
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
              <Button variant="outline-glow" size="xl" asChild>
                <a href="#create">Create a secret link</a>
              </Button>
            </motion.div>
          </motion.div>

          {/* How it works */}
          <motion.div
            className="max-w-4xl mx-auto mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground text-center mb-10">
              How secret sharing works
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {howItWorksSteps.map((item, i) => (
                <motion.div
                  key={item.step}
                  className="relative text-center group"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.3 + i * 0.1 }}
                  whileHover={{ y: -4 }}
                >
                  {i < howItWorksSteps.length - 1 && (
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
          </motion.div>

          {/* Trust signals + secret link form */}
          <motion.div
            id="create"
            className="w-full max-w-xl mx-auto space-y-4 scroll-mt-20"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
          >
            <p className="text-center text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Secure handoff
            </p>
            <div className="glass rounded-xl px-4 py-3 flex flex-wrap items-center justify-center gap-6 sm:gap-8 text-sm text-muted-foreground border border-border/80">
              {trustSignals.map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <item.icon className="w-4 h-4 text-primary shrink-0" />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
            <NoteForm />
          </motion.div>
        </div>
      </section>

      {/* Value bullets */}
      <motion.section
        className="border-y border-border bg-card/30 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.4 }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 sm:gap-x-14">
            {valueBullets.map((item, i) => (
              <motion.div
                key={item.label}
                className="flex items-center gap-2 text-sm text-muted-foreground"
                initial={{ opacity: 0, x: -8 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
              >
                <item.icon className="w-4 h-4 text-foreground shrink-0" />
                <span>{item.label}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Replacing feature cards with a single CTA to features page */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
        <motion.div
          className="text-center max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.4 }}
        >
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Security without complexity
          </h2>
          <p className="text-muted-foreground text-lg max-w-lg mx-auto mb-8">
            Time-boxed links, view caps, optional passphrases, and encryption at rest — so secrets leave your channel without sticking around in ours.
          </p>
          <Button variant="outline-glow" size="lg" asChild>
            <Link to="/features">
              Explore all features
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </motion.div>
        {/* Feature cards section commented out
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <motion.div key={f.title} className="glass glow-card rounded-2xl p-6 sm:p-8 group" ...>
              ...
            </motion.div>
          ))}
        </div>
        */}
      </section>

      {/* CTA */}
      <motion.section
        className="relative overflow-hidden"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.5 }}
      >
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28 text-center">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Ready for a safer handoff?
          </h2>
          <p className="text-muted-foreground text-lg max-w-md mx-auto mb-8">
            No sign-up. Seal a one-time secret link in seconds — ideal when chat and email are the wrong place for the actual credential.
          </p>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button variant="hero" size="xl" asChild>
              <a href="#create">
                Create a secret link
                <ArrowRight className="w-4 h-4" />
              </a>
            </Button>
          </motion.div>
        </div>
      </motion.section>

      <Footer />
    </div>
  );
};

export default Index;
