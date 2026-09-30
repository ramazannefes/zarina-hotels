"use client";

// Admin paneli genel hata sınırı — sunucu tarafı beklenmeyen hatalarda
// beyaz ekran yerine anlaşılır Türkçe bir ekran gösterir.

import { useEffect } from "react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin] sayfa hatası:", error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] items-center justify-center p-6">
      <div className="card max-w-md p-8 text-center">
        <p className="kicker">Hata</p>
        <h1 className="mt-2 font-display text-2xl">Bir şeyler ters gitti</h1>
        <p className="mt-3 text-sm text-ink-muted">
          Sayfa yüklenirken beklenmeyen bir hata oluştu. Lütfen tekrar deneyin; sorun sürerse
          sistem yöneticinize bildirin.
        </p>
        {error.digest && (
          <p className="mt-2 font-mono text-[11px] text-ink-muted">Hata kodu: {error.digest}</p>
        )}
        <div className="mt-6 flex justify-center gap-2">
          <button type="button" onClick={reset} className="btn-primary !px-4 !py-2 text-xs">
            Tekrar Dene
          </button>
          <a href="/admin" className="btn-ghost !px-4 !py-2 text-xs">Panele Dön</a>
        </div>
      </div>
    </div>
  );
}
