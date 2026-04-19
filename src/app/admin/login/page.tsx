"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Eye, EyeOff } from "lucide-react";

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

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    setNextPath(sanitizeNext(sp.get("next")));
    setError(sp.get("error"));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setSubmitting(true);
    try {
      const r = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

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

          {message && (
            <Alert>
              <AlertTitle>오류</AlertTitle>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

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
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2 p-1"
                  tabIndex={-1}
                  aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={submitting || redirecting}>
              {redirecting ? "이동 중..." : submitting ? "로그인 중..." : "로그인"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
