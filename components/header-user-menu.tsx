"use client";

// 마케팅 헤더 우상단 — 로그인된 사용자용 드롭다운 메뉴
//   · 이니셜 아바타 + 이름
//   · 대시보드 / 구독 관리 / 로그아웃

import { useState } from "react";
import Link from "next/link";

interface Props {
  email: string | null;
  name: string | null;
}

export function HeaderUserMenu({ email, name }: Props) {
  const [open, setOpen] = useState(false);

  // "김지원 / 부픽부동산" → "김지원"
  const display = name?.split(/[\s/]/)[0] || email?.split("@")[0] || "사용자";
  const initial = (name || email || "U").charAt(0).toUpperCase();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-2 px-1.5 py-1 rounded-md hover:bg-slate-100 transition"
      >
        <span className="w-8 h-8 rounded-full bg-navy-800 text-white text-xs font-bold flex items-center justify-center">
          {initial}
        </span>
        <span className="hidden sm:inline text-sm font-semibold text-navy-800 max-w-[120px] truncate">
          {display}
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-slate-400 hidden sm:block"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <>
          {/* 바깥 클릭 시 닫힘 */}
          <div
            className="fixed inset-0 z-30"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div
            role="menu"
            className="absolute right-0 top-full mt-1.5 w-56 rounded-lg border border-slate-200 bg-white shadow-lg z-40 overflow-hidden"
          >
            {email && (
              <div className="px-3.5 py-2.5 border-b border-slate-100">
                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                  로그인 중
                </div>
                <div className="text-xs text-slate-700 truncate mt-0.5">
                  {email}
                </div>
              </div>
            )}
            <Link
              href="/dashboard"
              className="block px-3.5 py-2.5 text-sm font-semibold text-navy-800 hover:bg-cream-100 transition"
              onClick={() => setOpen(false)}
            >
              대시보드 →
            </Link>
            <Link
              href="/dashboard/billing"
              className="block px-3.5 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition"
              onClick={() => setOpen(false)}
            >
              구독 관리
            </Link>
            <form
              action="/api/auth/logout"
              method="post"
              className="border-t border-slate-100"
            >
              <button
                type="submit"
                className="w-full text-left px-3.5 py-2.5 text-sm text-red-600 hover:bg-red-50 transition font-medium"
              >
                로그아웃
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
