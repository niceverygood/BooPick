"use client";

const INDUSTRIES = [
  { id: "결혼식장", label: "💍 결혼식장" },
  { id: "카페", label: "☕ 카페" },
  { id: "학원", label: "📚 학원" },
  { id: "필라테스", label: "🧘 필라테스" },
  { id: "식당", label: "🍽️ 식당" },
  { id: "미용실", label: "💇 미용실" },
  { id: "병원", label: "🏥 병원" },
  { id: "사무실", label: "🏢 사무실" },
];

interface Props {
  value: string | null;
  onChange: (v: string | null) => void;
}

export function IndustrySelector({ value, onChange }: Props) {
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onChange(null)}
        className={
          "px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors " +
          (value == null
            ? "bg-boopick-navy text-white border-boopick-navy"
            : "bg-white text-slate-600 border-slate-200 hover:border-boopick-orange")
        }
      >
        전체
      </button>
      {INDUSTRIES.map((i) => (
        <button
          key={i.id}
          type="button"
          onClick={() => onChange(i.id)}
          className={
            "px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors " +
            (value === i.id
              ? "bg-boopick-navy text-white border-boopick-navy"
              : "bg-white text-slate-600 border-slate-200 hover:border-boopick-orange")
          }
        >
          {i.label}
        </button>
      ))}
    </div>
  );
}
