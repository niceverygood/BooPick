"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface InitialValues {
  id?: string;
  address?: string;
  dong?: string;
  building_name?: string;
  area_pyeong?: number | null;
  floor?: number | null;
  total_floors?: number | null;
  building_type?: string;
  transaction_type?: string;
  deposit?: number | null;
  monthly_rent?: number | null;
  premium?: number | null;
  description?: string;
  short_description?: string;
}

interface Props {
  mode: "create" | "edit";
  initial?: InitialValues;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSubmit: (formData: FormData) => Promise<any>;
}

export function ListingForm({ mode, initial = {}, onSubmit }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await onSubmit(fd);
      if (res && res.ok === false) {
        setError(res.error ?? "저장 실패");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {initial.id && <input type="hidden" name="id" value={initial.id} />}

      <Card>
        <CardContent className="p-5 sm:p-6 space-y-4">
          <h2 className="text-base font-bold text-boopick-navy">매물 정보</h2>

          <Field
            id="address"
            label="주소 *"
            placeholder="서울 강남구 신사동 545-12"
            defaultValue={initial.address}
            required
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="dong"
              label="동 (자동 추출)"
              placeholder="신사동"
              defaultValue={initial.dong}
              hint="비워두면 주소에서 자동 추출"
            />
            <Field
              id="building_name"
              label="건물명"
              placeholder="가로수길빌딩"
              defaultValue={initial.building_name}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field
              id="area_pyeong"
              label="면적 (평)"
              inputMode="decimal"
              placeholder="25"
              defaultValue={initial.area_pyeong?.toString()}
            />
            <Field
              id="floor"
              label="해당층"
              inputMode="numeric"
              placeholder="1 (지하: -1)"
              defaultValue={initial.floor?.toString()}
            />
            <Field
              id="total_floors"
              label="전체층"
              inputMode="numeric"
              placeholder="5"
              defaultValue={initial.total_floors?.toString()}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              id="building_type"
              label="매물 유형 *"
              options={["상가", "사무실", "주거", "토지"]}
              defaultValue={initial.building_type ?? "상가"}
            />
            <Select
              id="transaction_type"
              label="거래 유형 *"
              options={["매매", "전세", "월세", "단기"]}
              defaultValue={initial.transaction_type ?? "월세"}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5 sm:p-6 space-y-4">
          <h2 className="text-base font-bold text-boopick-navy">금액</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field
              id="deposit"
              label="보증금 (원)"
              inputMode="numeric"
              placeholder="80000000"
              defaultValue={initial.deposit?.toString()}
              hint="8천만원 = 80000000"
            />
            <Field
              id="monthly_rent"
              label="월세 (원)"
              inputMode="numeric"
              placeholder="3500000"
              defaultValue={initial.monthly_rent?.toString()}
            />
            <Field
              id="premium"
              label="권리금 (원, 선택)"
              inputMode="numeric"
              placeholder="0"
              defaultValue={initial.premium?.toString()}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5 sm:p-6 space-y-4">
          <h2 className="text-base font-bold text-boopick-navy">설명</h2>
          <div>
            <Label htmlFor="short_description" className="text-sm">
              간략 설명 <span className="text-slate-400">(선택)</span>
            </Label>
            <Input
              id="short_description"
              name="short_description"
              placeholder="가로수길 코너 1층, 테라스 카페자리"
              defaultValue={initial.short_description}
              className="mt-1"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              매물 카드 헤드라인. 비워두면 본문 첫 100자 사용.
            </p>
          </div>
          <div>
            <Label htmlFor="description" className="text-sm">
              매물 설명 *
            </Label>
            <textarea
              id="description"
              name="description"
              rows={8}
              required
              placeholder="신사동 가로수길 코너 1층 25평. 통유리로 전면이 시원하게 트여 있고, 테라스 약 5평 별도 보유. 미용실·카페 운영하기 좋은 자리..."
              defaultValue={initial.description}
              className="mt-1 w-full px-3 py-2 text-sm rounded-md border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-boopick-orange resize-y"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              자세할수록 AI 태깅·매칭 정확도 ↑. 권리금/즉시입주/주차 등 조건 모두 적어주세요.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3 sticky bottom-0 bg-slate-50 py-3 border-t border-slate-200 -mx-4 px-4 sm:mx-0 sm:px-0 sm:bg-transparent sm:border-none sm:static">
        <Button
          type="submit"
          disabled={pending}
          size="lg"
          className="bg-boopick-navy hover:bg-boopick-navy/90 text-white"
        >
          {pending
            ? mode === "create"
              ? "등록 중… (AI 태깅 + 임베딩)"
              : "저장 중…"
            : mode === "create"
              ? "매물 등록"
              : "변경사항 저장"}
        </Button>
        {error && <span className="text-xs text-red-600">{error}</span>}
        {pending && mode === "create" && (
          <span className="text-xs text-slate-400">
            보통 3~10초 걸립니다 (Claude + OpenAI 호출).
          </span>
        )}
      </div>
    </form>
  );
}

function Field(props: {
  id: string;
  label: string;
  placeholder?: string;
  defaultValue?: string;
  required?: boolean;
  inputMode?: "text" | "tel" | "url" | "email" | "numeric" | "decimal";
  hint?: string;
}) {
  return (
    <div>
      <Label htmlFor={props.id} className="text-sm">
        {props.label}
      </Label>
      <Input
        id={props.id}
        name={props.id}
        type="text"
        inputMode={props.inputMode}
        placeholder={props.placeholder}
        defaultValue={props.defaultValue}
        required={props.required}
        className="mt-1"
      />
      {props.hint && (
        <p className="text-[11px] text-slate-400 mt-1">{props.hint}</p>
      )}
    </div>
  );
}

function Select(props: {
  id: string;
  label: string;
  options: string[];
  defaultValue: string;
}) {
  return (
    <div>
      <Label htmlFor={props.id} className="text-sm">
        {props.label}
      </Label>
      <select
        id={props.id}
        name={props.id}
        defaultValue={props.defaultValue}
        className="mt-1 w-full h-9 px-2 rounded-md border border-slate-200 bg-white text-sm"
      >
        {props.options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}
