"use client";

import { useState, useRef, useEffect, forwardRef } from "react";
import { copy, HOW_IT_WORKS } from "@/lib/copy";
import { StickyMomentCard } from "./StickyMomentCard";
import type { HowItWorksStep } from "@/lib/types";

export function HowItWorks() {
  const [activeStep, setActiveStep] = useState(0);
  const panelRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const i = panelRefs.current.indexOf(entry.target as HTMLDivElement);
            if (i !== -1) setActiveStep(i);
          }
        });
      },
      { threshold: 0.45 }
    );
    panelRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <section id="how-it-works" className="bg-landing-cream relative z-20 -mt-16 rounded-t-[48px] shadow-2xl">
      {/* Mobile View */}
      <div className="lg:hidden">
        {/* Section intro */}
        <div className="text-center px-8 pt-20 pb-10">
          <p className="text-[11px] font-medium tracking-[0.14em] text-ink-ghost uppercase mb-3">
            {copy.landing.howItWorksTitle}
          </p>
          <h2 className="font-display text-[36px] font-bold text-ink leading-[1.1] mb-3 whitespace-pre-line">
            {copy.landing.howItWorksHeading}
          </h2>
          <p className="text-[15px] text-ink-secondary max-w-sm mx-auto">
            {copy.landing.howItWorksSubcopy}
          </p>
        </div>

        {/* Mobile static card */}
        <div className="flex justify-center py-10">
          <StickyMomentCard activeStep={0} />
        </div>

        {/* Stacked feature panels for mobile */}
        <div className="px-8 space-y-14 pb-20">
          {HOW_IT_WORKS.map((step, i) => (
            <div key={i} className="max-w-[280px] mx-auto text-center">
              <p className="text-[11px] font-medium tracking-[0.14em] text-ink-ghost uppercase mb-3.5">
                {step.number}
              </p>
              <h3 className="font-display text-[28px] font-bold text-ink leading-[1.15] mb-3 whitespace-pre-line">
                {step.heading}
              </h3>
              <p className="text-[14px] text-ink-secondary leading-[1.7]">
                {step.body}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Desktop View */}
      <div className="hidden lg:block relative">
        {/* Sticky card overlay — zero height so it doesn't push content */}
        <div className="sticky top-0 h-0 z-10 flex justify-center pointer-events-none">
          <div className="mt-[calc(50vh-134px)] pointer-events-auto">
            <StickyMomentCard activeStep={activeStep} />
          </div>
        </div>

        {/* Section intro */}
        <div className="text-center px-8 pt-20 pb-24">
          <p className="text-[11px] font-medium tracking-[0.14em] text-ink-ghost uppercase mb-3">
            {copy.landing.howItWorksTitle}
          </p>
          <h2 className="font-display text-[36px] font-bold text-ink leading-[1.1] mb-3 whitespace-pre-line">
            {copy.landing.howItWorksHeading}
          </h2>
          <p className="text-[15px] text-ink-secondary max-w-sm mx-auto mb-6">
            {copy.landing.howItWorksSubcopy}
          </p>
          {/* Progress dots */}
          <div className="flex items-center justify-center gap-1.5">
            {HOW_IT_WORKS.map((_, i) => (
              <span
                key={i}
                className="h-1.5 rounded-full bg-ink transition-all duration-300"
                style={{ width: i === activeStep ? 18 : 6, opacity: i === activeStep ? 1 : 0.18 }}
              />
            ))}
          </div>
        </div>

        {/* Feature panels — stacked, each min-h-screen */}
        <div className="px-8">
          {HOW_IT_WORKS.map((step, i) => (
            <FeaturePanel
              key={i}
              step={step}
              index={i}
              ref={(el) => {
                panelRefs.current[i] = el;
              }}
            />
          ))}
        </div>

        <div className="h-[30vh]" /> {/* breathing room at bottom */}
      </div>
    </section>
  );
}

const FeaturePanel = forwardRef<
  HTMLDivElement,
  { step: HowItWorksStep; index: number }
>(({ step, index }, ref) => {
  return (
    <div
      ref={ref}
      className="min-h-screen flex items-center"
    >
      {step.side === 'left' ? (
        <div className="flex justify-end w-full pr-[240px]">
          <TextBlock step={step} />
        </div>
      ) : (
        <div className="flex justify-start w-full pl-[240px]">
          <TextBlock step={step} />
        </div>
      )}
    </div>
  );
});
FeaturePanel.displayName = "FeaturePanel";

function TextBlock({ step }: { step: HowItWorksStep }) {
  return (
    <div className="max-w-[220px]">
      <p className="text-[11px] font-medium tracking-[0.14em] text-ink-ghost uppercase mb-3.5">
        {step.number}
      </p>
      <h3 className="font-display text-[28px] font-bold text-ink leading-[1.15] mb-3 whitespace-pre-line">
        {step.heading}
      </h3>
      <p className="text-[14px] text-ink-secondary leading-[1.7]">
        {step.body}
      </p>
    </div>
  );
}
