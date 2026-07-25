import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Check, ArrowRight, Zap, Star } from "lucide-react";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Perfect for personal use and quick shares.",
    features: [
      "Unlimited notes",
      "Self-destructing links",
      "1 hour / 24 hour / 7 day expiry",
      "Max 5 views per note",
      "Community support",
    ],
    cta: "Get started free",
    variant: "outline-glow" as const,
    popular: false,
  },
  {
    name: "Pro",
    price: "$9",
    period: "/month",
    description: "For teams and professionals who need more control.",
    features: [
      "Everything in Free",
      "Unlimited views per note",
      "Custom expiration (up to 30 days)",
      "Password-protected notes",
      "API access (10K calls/mo)",
      "Priority support",
      "Custom branding",
    ],
    cta: "Start 14-day free trial",
    variant: "hero" as const,
    popular: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For organizations with advanced security requirements.",
    features: [
      "Everything in Pro",
      "Unlimited API calls",
      "SSO / SAML integration",
      "Audit logs & compliance",
      "On-premise deployment",
      "Dedicated account manager",
      "SLA guarantee (99.99%)",
      "Custom data retention",
    ],
    cta: "Contact sales",
    variant: "outline-glow" as const,
    popular: false,
  },
];

const faqs = [
  {
    q: "Can I use getsecret for free?",
    a: "Yes! The free plan includes unlimited notes with self-destructing links. No credit card required.",
  },
  {
    q: "Is my data really secure?",
    a: "Absolutely. Notes are encrypted in transit (HTTPS) and at rest. We use AES-256-GCM for storage and never store plain text.",
  },
  {
    q: "What happens when a note expires?",
    a: "Expired notes are permanently deleted from our servers. There is no way to recover them — by design.",
  },
  {
    q: "Can I cancel my subscription anytime?",
    a: "Yes. You can cancel at any time with no questions asked. Your data will be purged within 24 hours.",
  },
];

const Pricing = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-16 sm:pt-28 sm:pb-20 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-sm text-muted-foreground mb-6 opacity-0 animate-fade-in-up">
            <Star className="w-3.5 h-3.5 text-foreground" />
            Simple, transparent pricing
          </div>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-5 opacity-0 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
            Plans that <span className="font-bold">scale with you</span>
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-xl mx-auto opacity-0 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
            Start free, upgrade when you need more. No hidden fees, no surprises.
          </p>
        </div>
      </section>

      {/* Pricing cards */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-20 sm:pb-28 -mt-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative glass rounded-2xl p-6 sm:p-8 flex flex-col transition-all duration-300 hover:scale-[1.02] glow-card ${
                plan.popular ? "ring-2 ring-foreground/20" : ""
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                  Most popular
                </div>
              )}
              <div className="mb-6">
                <h3 className="font-display font-semibold text-foreground text-lg mb-1">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
                <div className="flex items-baseline gap-1">
                  <span className="font-display text-4xl font-bold text-foreground">{plan.price}</span>
                  {plan.period && (
                    <span className="text-muted-foreground text-sm">{plan.period}</span>
                  )}
                </div>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-foreground shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button variant={plan.variant} size="lg" className="w-full">
                {plan.cta}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-border bg-card/30 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground text-center mb-14">
            Frequently asked questions
          </h2>
          <div className="space-y-6">
            {faqs.map((faq) => (
              <div key={faq.q} className="glass glow-card rounded-xl p-6">
                <h3 className="font-display font-semibold text-foreground mb-2">{faq.q}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden">
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-20 text-center">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Start sharing securely today
          </h2>
          <p className="text-muted-foreground text-lg max-w-md mx-auto mb-8">
            Join thousands of teams who trust getsecret with their sensitive data.
          </p>
          <Button variant="hero" size="xl" asChild>
            <Link to="/">
              Create your first note
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Pricing;
