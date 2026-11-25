import Link from "next/link";

export function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link className={`brand${light ? " brand-light" : ""}`} href="/#top" aria-label="challengeKit home">
      <span className="brand-mark" aria-hidden="true"><span>✳</span></span>
      <span>challenge<span className="brand-kit">Kit</span><span className="brand-period">.</span></span>
    </Link>
  );
}
