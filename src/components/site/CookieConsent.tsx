"use client";

// GDPR-conscious cookie consent — necessary cookies always on;
// analytics/marketing load ONLY after explicit consent (brief #32).

import { useEffect, useState } from "react";

const CONSENT_KEY = "zarina_cookie_consent";

type Consent = { necessary: true; analytics: boolean; marketing: boolean; at: string };

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(CONSENT_KEY);
      if (!raw) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  function persist(next: Consent) {
    try {
      window.localStorage.setItem(CONSENT_KEY, JSON.stringify(next));
    } catch {
      // storage unavailable — session-only consent
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div role="dialog" aria-label="Cookie preferences" className="fixed inset-x-4 bottom-4 z-[60] mx-auto max-w-2xl border border-sand-200 bg-white p-5 shadow-lift">
      <p className="text-sm font-medium">We use cookies</p>
      <p className="mt-1 text-xs leading-5 text-ink-muted">
        Necessary cookies keep booking and security working. Analytics and marketing cookies load only with your consent. Read our{" "}
        <a href="/en/cookies" className="link-underline">Cookie Policy</a>.
      </p>
      <div className="mt-3 flex flex-wrap gap-4 text-xs">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked disabled /> Necessary
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} /> Analytics
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} /> Marketing
        </label>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" onClick={() => persist({ necessary: true, analytics, marketing, at: new Date().toISOString() })} className="btn-primary !px-4 !py-2 text-xs">
          Save preferences
        </button>
        <button type="button" onClick={() => persist({ necessary: true, analytics: false, marketing: false, at: new Date().toISOString() })} className="btn-ghost !px-4 !py-2 text-xs">
          Only necessary
        </button>
      </div>
    </div>
  );
}
