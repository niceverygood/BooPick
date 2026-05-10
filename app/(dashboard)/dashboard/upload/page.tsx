import { Card, CardContent } from "@/components/ui/card";
import { UploadDropzone } from "@/components/upload-dropzone";

export const dynamic = "force-dynamic";

export default function UploadPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-boopick-navy">
          매물 데이터 업로드
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          xlsx (Excel) 파일을 업로드하면 AI가 자동으로 정리합니다.
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <UploadDropzone />
        </CardContent>
      </Card>

      <Card className="bg-amber-50 border-amber-200">
        <CardContent className="p-5">
          <p className="text-sm font-semibold text-amber-900 mb-1">
            💡 권장 컬럼
          </p>
          <p className="text-xs text-amber-800 leading-relaxed">
            매물번호 / 지역 / 공급m² / 전용m² / 해당층 / 전체층 / 보증금 / 월세
            / 관리비 / 현재업종 / 추천업종 / 간략설명 / 설명 / 주소 /
            사용승인일 / 중개사무소명
          </p>
          <p className="text-xs text-amber-700 mt-2">
            컬럼명이 정확히 일치하지 않아도 AI가 자동 매핑합니다.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
