/**
 * src/components/landing/HowItWorks.tsx
 * Three equal-weight beats explaining the core loop, on the cream landing theme.
 */

import { copy } from "@/lib/copy";

export function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-landing-cream py-24 px-6">
      <div className="mx-auto max-w-5xl">
        <h2 className="font-landing-display text-3xl sm:text-4xl font-bold text-landing-ink text-center mb-16">
          {copy.landing.howItWorksTitle}
        </h2>

        <div className="grid gap-8 sm:grid-cols-3">
          {copy.landing.howItWorks.map((step, i) => (
            <div key={step.title} className="rounded-landing bg-white/60 border border-landing-ink/10 p-8 text-center">
              <span className="font-landing-display text-sm font-bold text-landing-teal">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="font-landing-display text-xl font-bold text-landing-ink mt-3 mb-2">
                {step.title}
              </h3>
              <p className="font-landing-body text-sm text-landing-ink/70 leading-relaxed">
                {step.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
