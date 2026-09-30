export default function PmsCalendarLegend() {
  const items = [
    { cls: "bg-emerald-100 border-emerald-300", label: "Konaklıyor (check-in yapıldı)" },
    { cls: "bg-sea-100 border-sea-300", label: "Onaylı rezervasyon" },
    { cls: "bg-amber-50 border-amber-200", label: "Bekleyen rezervasyon" },
    { cls: "bg-sand-200 border-sand-300", label: "Bakım / Blokeli" },
    { cls: "bg-white border-sand-200", label: "Boş" },
  ];
  return (
    <ul className="mt-4 flex flex-wrap gap-3 text-[11px] text-ink-soft">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          <span className={`inline-block h-3 w-5 rounded border ${i.cls}`} aria-hidden />
          {i.label}
        </li>
      ))}
    </ul>
  );
}
