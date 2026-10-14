/**
 * An author name. Usernames arrive as "@name"; the at-sign is set in the mono
 * face and muted so it reads as a handle marker instead of a stray glyph.
 * Plain names (archive credits) render untouched.
 */
export default function Handle({ name, className = "" }: { name: string; className?: string }) {
  if (!name.startsWith("@")) return <span className={className}>{name}</span>;
  return (
    <span className={className}>
      <span className="font-mono text-[0.92em] text-text-3">@</span>
      {name.slice(1)}
    </span>
  );
}
