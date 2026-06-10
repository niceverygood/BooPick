/**
 * 부픽(BooPick) 모바일 — boo-pick.vercel.app WebView 래퍼.
 *
 * 포함:
 *  - 로딩 인디케이터 / 첫 로드 스플래시 유지
 *  - Android 하드웨어 뒤로가기 → WebView 히스토리
 *  - 외부 도메인 링크는 시스템 브라우저로
 *  - <input type=file> (엑셀 업로드) 지원 (react-native-webview 기본)
 *  - 네트워크 오류 시 재시도 화면
 */

import Constants from "expo-constants";
import { StatusBar } from "expo-status-bar";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { WebView, type WebViewNavigation } from "react-native-webview";
import { useEffect } from "react";

const APP_URL = "https://boo-pick.vercel.app/";
const APP_HOST = "boo-pick.vercel.app";
const BRAND = "#1F3A5F"; // 부픽 navy

export default function App() {
  const webRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const canGoBack = useRef(false);

  // Android 하드웨어 뒤로가기 → WebView 뒤로
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (canGoBack.current && webRef.current) {
        webRef.current.goBack();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, []);

  const onNavChange = useCallback((nav: WebViewNavigation) => {
    canGoBack.current = nav.canGoBack;
  }, []);

  // 외부 도메인은 시스템 브라우저로 (앱 내 유지 = 부픽 도메인만)
  const onShouldStart = useCallback((req: WebViewNavigation): boolean => {
    const url = req.url;
    if (!url.startsWith("http")) {
      // tel:, mailto:, kakaolink 등은 시스템에 위임
      Linking.openURL(url).catch(() => {});
      return false;
    }
    try {
      const host = new URL(url).host;
      const internal =
        host === APP_HOST ||
        host.endsWith(".vercel.app") ||
        host.includes("supabase") ||
        host.includes("tosspayments") ||
        host.includes("kakao");
      if (!internal) {
        Linking.openURL(url).catch(() => {});
        return false;
      }
    } catch {
      /* URL 파싱 실패 시 그대로 로드 */
    }
    return true;
  }, []);

  const reload = useCallback(() => {
    setError(false);
    setLoading(true);
    webRef.current?.reload();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        {error ? (
          <View style={styles.center}>
            <Text style={styles.errTitle}>연결할 수 없습니다</Text>
            <Text style={styles.errSub}>
              네트워크 상태를 확인하고 다시 시도해 주세요.
            </Text>
            <TouchableOpacity style={styles.retryBtn} onPress={reload}>
              <Text style={styles.retryText}>다시 시도</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <WebView
              ref={webRef}
              source={{ uri: APP_URL }}
              onNavigationStateChange={onNavChange}
              onShouldStartLoadWithRequest={onShouldStart}
              onLoadEnd={() => setLoading(false)}
              onError={() => {
                setLoading(false);
                setError(true);
              }}
              onHttpError={(e) => {
                if (e.nativeEvent.statusCode >= 500) setError(true);
              }}
              // 엑셀 업로드 등 파일 입력 지원
              allowFileAccess
              allowsInlineMediaPlayback
              originWhitelist={["*"]}
              // iOS 당겨서 새로고침
              pullToRefreshEnabled
              // 세션/스토리지 유지
              sharedCookiesEnabled
              thirdPartyCookiesEnabled
              domStorageEnabled
              javaScriptEnabled
              startInLoadingState={false}
              decelerationRate="normal"
              userAgent={`BooPickApp/${Constants.expoConfig?.version ?? "1.0.0"} (${Platform.OS})`}
            />
            {loading && (
              <View style={styles.loadingOverlay} pointerEvents="none">
                <ActivityIndicator size="large" color={BRAND} />
              </View>
            )}
          </>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#ffffff" },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    backgroundColor: "#ffffff",
  },
  errTitle: { fontSize: 18, fontWeight: "700", color: BRAND, marginBottom: 8 },
  errSub: { fontSize: 14, color: "#64748b", textAlign: "center", marginBottom: 20 },
  retryBtn: {
    backgroundColor: BRAND,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryText: { color: "#fff", fontSize: 15, fontWeight: "600" },
});
