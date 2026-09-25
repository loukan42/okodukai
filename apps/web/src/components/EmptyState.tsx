export function EmptyState({ emoji, title, subtitle }: { emoji: string; title: string; subtitle: string }) {
  return (
    <div className="empty-state">
      <span className="emoji" aria-hidden>
        {emoji}
      </span>
      <p style={{ fontWeight: 700, color: "var(--ink)" }}>{title}</p>
      <p className="text-sm">{subtitle}</p>
    </div>
  );
}
