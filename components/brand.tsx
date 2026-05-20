// 부픽 브랜드 공유 컴포넌트 (디자인 프로토타입 shared atoms 이식)
//
// - Logo: navy 라운드 스퀘어 + house+orange-check 아이콘 + "부픽." (orange period)
// - Signal: safe / warn / risk 신호 pill
// - Chip: 작은 태그
// - Disclaimer: 면책 고지 박스
//
// 서버 컴포넌트로 사용 가능 (상태/이벤트 없음).

import { cn } from "@/lib/utils";

// ── Logo ────────────────────────────────────────────────────
export function Logo({
  size = 22,
  dark = false,
  className,
}: {
  size?: number;
  dark?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        className="flex items-center justify-center rounded-lg bg-navy-800"
        style={{ width: size + 8, height: size + 8 }}
      >
        <svg
          width={size * 0.7}
          height={size * 0.7}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
        >
          <path
            d="M4 11 12 4l8 7v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8Z"
            stroke="#fff"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="m9 12 2.5 2.5L16 10"
            stroke="#ff6b35"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span
        className="font-extrabold tracking-tight"
        style={{ fontSize: size, color: dark ? "#fff" : "#0a2540" }}
      >
        부픽<span style={{ color: "#ff6b35" }}>.</span>
      </span>
    </span>
  );
}

// ── Signal (safe / warn / risk) ─────────────────────────────
export type SignalLevel = "safe" | "warn" | "risk";

export function Signal({
  level = "warn",
  label,
}: {
  level?: SignalLevel;
  label?: string;
}) {
  const defaults: Record<SignalLevel, string> = {
    safe: "안전",
    warn: "주의",
    risk: "위험",
  };
  const icon: Record<SignalLevel, React.ReactNode> = {
    safe: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12.5l4.5 4.5L19 7" />
      </svg>
    ),
    warn: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 9v4.5" />
        <path d="M12 17h.01" />
        <path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.7 3.86a2 2 0 0 0-3.4 0Z" />
      </svg>
    ),
    risk: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="m5.5 5.5 13 13" />
      </svg>
    ),
  };
  return (
    <span className={cn("bp-signal", level)}>
      <span className="dot" />
      <span className="inline-flex items-center gap-1">
        {icon[level]}
        {label ?? defaults[level]}
      </span>
    </span>
  );
}

// ── Chip ────────────────────────────────────────────────────
type ChipTone = "neutral" | "navy" | "orange" | "safe" | "warn" | "risk";

const CHIP_TONES: Record<ChipTone, string> = {
  neutral: "bg-cream-100 border-slate-200 text-slate-700",
  navy: "bg-navy-50 border-navy-100 text-navy-800",
  orange: "bg-brand-orange-50 border-brand-orange-100 text-brand-orange-700",
  safe: "bg-[var(--safe-bg)] border-[var(--safe-bd)] text-[#166534]",
  warn: "bg-[var(--warn-bg)] border-[var(--warn-bd)] text-[var(--warn-strong)]",
  risk: "bg-[var(--risk-bg)] border-[var(--risk-bd)] text-[#991b1b]",
};

export function Chip({
  children,
  tone = "neutral",
  icon,
  className,
}: {
  children: React.ReactNode;
  tone?: ChipTone;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
        CHIP_TONES[tone],
        className
      )}
    >
      {icon}
      {children}
    </span>
  );
}

// ── Disclaimer ──────────────────────────────────────────────
export function Disclaimer({
  compact = false,
  children,
}: {
  compact?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-2.5 text-xs leading-relaxed text-slate-500",
        compact
          ? "bg-transparent py-2"
          : "rounded-xl border border-cream-300 bg-cream-200 px-4 py-3.5"
      )}
    >
      <svg
        className="mt-0.5 shrink-0 text-slate-400"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 3 4 6v6c0 4.5 3.5 8 8 9 4.5-1 8-4.5 8-9V6l-8-3Z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
      <span>
        {children ??
          "본 정보는 매물 데이터 분석을 보조하는 참고용이며, 매물 추천·중개·자문이 아닙니다. 최종 의사결정 책임은 사용자에게 있습니다."}
      </span>
    </div>
  );
}
