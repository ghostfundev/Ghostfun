import Link from "next/link";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className={`brand ${compact ? "brand-compact" : ""}`} aria-label="GHOSTFUN home">
      <svg className="brand-symbol" viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <path d="M24 5.6C15.9 5.6 9 12.7 9 21.4V42.4l5-3.6 5 3.6 5-3.6 5 3.6 5-3.6 5 3.6V21.4C39 12.7 32.1 5.6 24 5.6Z" fill="currentColor" />
        <path d="M18.6 22.2a2.7 2.7 0 1 0 0-5.4 2.7 2.7 0 0 0 0 5.4ZM29.4 22.2a2.7 2.7 0 1 0 0-5.4 2.7 2.7 0 0 0 0 5.4Z" fill="#030405" />
      </svg>
      <span className="brand-wordmark"><strong>GHOSTFUN</strong><small>ON NEAR</small></span>
    </Link>
  );
}
