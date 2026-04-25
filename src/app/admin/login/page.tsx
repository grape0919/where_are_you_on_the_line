"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Eye, EyeOff, Clock } from "lucide-react";

function sanitizeNext(nextValue: string | null): string {
  if (!nextValue) return "/admin";
  if (nextValue.startsWith("/admin")) return nextValue;
  return "/admin";
}

export default function AdminLoginPage() {
  const [nextPath, setNextPath] = useState("/admin");
  const [error, setError] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Rate limit 카운트다운 (429 응답 시 retry-after 초 단위)
  const [retryAfter, setRetryAfter] = useState<number | null>(null);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    setNextPath(sanitizeNext(sp.get("next")));
    setError(sp.get("error"));
  }, []);

  // 카운트다운 1초 틱
  useEffect(() => {
    if (retryAfter == null || retryAfter <= 0) return;
    const id = setInterval(() => {
      setRetryAfter((s) => {
        if (s == null || s <= 1) return null; // 0 도달 → null로 풀림
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [retryAfter]);

  const isLocked = retryAfter != null && retryAfter > 0;
  const formDisabled = submitting || redirecting || isLocked;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formDisabled) return;
    setMessage(null);
    setSubmitting(true);
    try {
      const r = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (r.status === 429) {
        const header = r.headers.get("Retry-After");
        const seconds = header ? parseInt(header, 10) : 10;
        setRetryAfter(Number.isFinite(seconds) && seconds > 0 ? seconds : 10);
        const data = (await r.json().catch(() => null)) as { error?: string } | null;
        setMessage(data?.error ?? "잠시 후 다시 시도해주세요.");
        return;
      }

      if (!r.ok) {
        const data = (await r.json().catch(() => null)) as { error?: string } | null;
        setMessage(data?.error ?? "로그인에 실패했습니다.");
        return;
      }

      setRedirecting(true);
      window.location.assign(nextPath);
      return;
    } catch (e) {
      console.error("Admin login failed:", e);
      setMessage("로그인 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-background flex min-h-[100dvh] w-full items-center justify-center px-4 py-6">
      <Card className="w-full max-w-md rounded-2xl shadow-sm">
        <CardHeader className="space-y-2">
          <div className="flex items-center justify-between">
            <CardTitle>관리자 로그인</CardTitle>
          </div>
          <CardDescription>관리자 비밀번호를 입력해 주세요.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error === "missing-secret" && (
            <Alert>
              <AlertTitle>설정 필요</AlertTitle>
              <AlertDescription>
                서버 환경변수 <span className="font-mono">ADMIN_SECRET</span>이 설정되지 않았습니다.
              </AlertDescription>
            </Alert>
          )}

          {isLocked ? (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertTitle>일시 차단됨</AlertTitle>
              <AlertDescription>
                연속 로그인 시도가 많아 잠시 차단되었습니다.{" "}
                <span className="text-foreground font-semibold">{retryAfter}초</span> 후 자동으로
                풀립니다.
              </AlertDescription>
            </Alert>
          ) : message ? (
            <Alert>
              <AlertTitle>오류</AlertTitle>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="관리자 비밀번호"
                  required
                  disabled={isLocked}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2 p-1 disabled:opacity-50"
                  tabIndex={-1}
                  disabled={isLocked}
                  aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={formDisabled}>
              {redirecting
                ? "이동 중..."
                : submitting
                  ? "로그인 중..."
                  : isLocked
                    ? `${retryAfter}초 후 재시도 가능`
                    : "로그인"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
