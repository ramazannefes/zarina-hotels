"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  locale: string;
  bookingId: string;
  reference: string;
  providerName: string;
  redirectUrl: string | null;
  holdExpiresAt: string | null;
};

export default function PaymentPanel({ locale, bookingId, reference, providerName, redirectUrl, holdExpiresAt }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMock = providerName === "MOCK";

  async function payMock(success: boolean) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/payments/mock/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, success }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "PAYMENT_ERROR");
        setBusy(false);
        return;
      }
      router.push(success ? `/${locale}/booking/confirmation?ref=${encodeURIComponent(reference)}` : `/${locale}/payment/failed?ref=${encodeURIComponent(reference)}`);
    } catch {
      setError("NETWORK_ERROR");
      setBusy(false);
    }
  }

  const expired = holdExpiresAt ? new Date(holdExpiresAt) < new Date() : false;
  if (expired) {
    return (
      <div className="mt-6 border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900" role="alert">
        Your booking hold has expired. Please start a new search — inventory has been released.
      </div>
    );
  }

  return (
    <div className="mt-6">
      {isMock ? (
        <>
          <div className="mb-4 border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-900">
            DEMO PAYMENT — MOCK provider active. No real charge. Production uses BOG/TBC hosted checkout.
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button type="button" disabled={busy} onClick={() => payMock(true)} className="btn-primary flex-1">
              {busy ? "Processing…" : "Pay now (success)"}
            </button>
            <button type="button" disabled={busy} onClick={() => payMock(false)} className="btn-ghost flex-1">
              Simulate failure
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-ink-muted">You will be redirected to our secure payment page.</p>
          {redirectUrl && (
            <a href={redirectUrl} className="btn-primary mt-4 w-full">Proceed to secure payment</a>
          )}
        </>
      )}
      {error && <p role="alert" className="mt-3 border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">Payment error: {error}</p>}
    </div>
  );
}
