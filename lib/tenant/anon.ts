// 임차인 비로그인 추적용 anon_token (브라우저 localStorage)
// 카톡 로그인 시점에 tenants.kakao_id로 병합.

const STORAGE_KEY = "boopick_anon_token";

export function getAnonToken(): string {
  if (typeof window === "undefined") return "";
  let token = localStorage.getItem(STORAGE_KEY);
  if (!token) {
    token = "anon_" + crypto.randomUUID().replace(/-/g, "");
    localStorage.setItem(STORAGE_KEY, token);
  }
  return token;
}

export function clearAnonToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
