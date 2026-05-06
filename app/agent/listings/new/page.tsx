import Link from "next/link";
import { ListingForm } from "@/components/agent/listing-form";
import { createListing } from "../actions";

export const dynamic = "force-dynamic";

export default function NewListingPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <Link
        href="/agent/listings"
        className="text-sm text-slate-500 hover:text-boopick-navy inline-flex items-center gap-1"
      >
        ← 매물 목록
      </Link>
      <h1 className="text-2xl sm:text-3xl font-bold text-boopick-navy">
        새 매물 등록
      </h1>
      <p className="text-sm text-slate-500">
        등록 즉시 AI 자동 태깅 + 임베딩 처리 → 임차인 검색 결과에 노출됩니다 (Pro 플랜 이상).
      </p>

      <ListingForm mode="create" onSubmit={createListing} />
    </div>
  );
}
