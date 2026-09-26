import Link from "next/link";

export default function LocaleNotFound() {
  return (
    <div className="mx-auto max-w-xl px-5 py-24 text-center">
      <p className="kicker">404</p>
      <h1 className="mt-3 font-display text-4xl">Page not found</h1>
      <p className="mt-3 text-sm text-ink-muted">The page you are looking for has moved or never existed.</p>
      <div className="mt-8 flex justify-center gap-3">
        <Link href="/" className="btn-primary !px-5 !py-2.5 text-xs">Home</Link>
        <Link href="/en/hotels" className="btn-ghost !px-5 !py-2.5 text-xs">Our hotels</Link>
      </div>
    </div>
  );
}
