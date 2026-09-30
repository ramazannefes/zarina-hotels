"use client";

// Client-side CSV export (Excel uyumlu, BOM'lu, ; ayraçlı).
// Rapor verileri zaten server'da hesaplanıp props ile gelir.

type Row = Record<string, string | number>;

function toCsv(sheets: { name: string; rows: Row[] }[]): string {
  const lines: string[] = [];
  for (const sheet of sheets) {
    if (sheet.rows.length === 0) continue;
    lines.push(`=== ${sheet.name} ===`);
    const first = sheet.rows[0];
    if (!first) continue;
    const headers = Object.keys(first);
    lines.push(headers.join(";"));
    for (const row of sheet.rows) {
      lines.push(
        headers
          .map((h) => {
            const v = row[h] ?? "";
            const s = String(v);
            return s.includes(";") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
          })
          .join(";"),
      );
    }
    lines.push("");
  }
  return lines.join("\n");
}

export default function CsvExportButton({ filename, rows }: { filename: string; rows: Record<string, Row[]> }) {
  function download() {
    const sheets = Object.entries(rows).map(([name, r]) => ({ name, rows: r }));
    const csv = "\uFEFF" + toCsv(sheets); // UTF-8 BOM — Excel Türkçe karakter uyumu
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button type="button" onClick={download} className="btn-ghost !px-4 !py-2 text-xs">
      ⬇ CSV İndir
    </button>
  );
}
