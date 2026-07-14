export function FixturesEmptyState() {
  return (
    <div className="text-center py-16 px-6 bg-cream-surface rounded-2xl border border-cream-border">
      <div className="w-12 h-12 rounded-full bg-cream-muted/50 flex items-center justify-center mx-auto mb-4">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9B9187" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
      </div>
      <h3 className="font-display text-lg font-bold text-ink mb-2">No matches scheduled</h3>
      <p className="text-[13px] text-ink-ghost leading-relaxed">
        Check back when the next round<br />of fixtures is confirmed.
      </p>
    </div>
  )
}
