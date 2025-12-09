"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Settings, Bell, Database, Palette } from "lucide-react";
import { useThemePreset } from "@/app/providers";

export default function SettingsPage() {
  const { theme, setTheme } = useThemePreset();
  return (
    <div className="space-y-6 p-6">
      {/* 시스템 설정 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            시스템 설정
          </CardTitle>
          <CardDescription>대기열 시스템의 기본 설정을 관리합니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="hospitalName">병원명</Label>
              <Input id="hospitalName" placeholder="병원명을 입력하세요" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="autoRefresh">자동 새로고침 간격 (초)</Label>
              <Input id="autoRefresh" type="number" defaultValue="30" />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>실시간 알림</Label>
              <p className="text-muted-foreground text-sm">
                새로운 환자 접수 시 알림을 표시합니다.
              </p>
            </div>
            <Switch />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>자동 완료 처리</Label>
              <p className="text-muted-foreground text-sm">
                대기시간이 만료된 환자를 자동으로 완료 처리합니다.
              </p>
            </div>
            <Switch />
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* 알림 설정 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            알림 설정
          </CardTitle>
          <CardDescription>시스템 알림 및 경고 설정을 관리합니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>임박 환자 알림</Label>
              <p className="text-muted-foreground text-sm">
                5분 이내 대기 환자에 대한 알림을 표시합니다.
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>완료 처리 알림</Label>
              <p className="text-muted-foreground text-sm">환자 완료 처리 시 알림을 표시합니다.</p>
            </div>
            <Switch />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>음성 알림</Label>
              <p className="text-muted-foreground text-sm">브라우저 음성 알림을 사용합니다.</p>
            </div>
            <Switch />
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* 데이터 관리 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            데이터 관리
          </CardTitle>
          <CardDescription>시스템 데이터를 관리하고 백업합니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>데이터 백업</Label>
              <p className="text-muted-foreground text-sm">현재 시스템 데이터를 백업합니다.</p>
            </div>
            <Button variant="outline" size="sm">
              백업 다운로드
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>데이터 초기화</Label>
              <p className="text-muted-foreground text-sm">
                모든 대기열 데이터를 삭제합니다. (복구 불가)
              </p>
            </div>
            <Button variant="destructive" size="sm">
              초기화
            </Button>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* 테마 설정 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            테마 설정
          </CardTitle>
          <CardDescription>시스템의 외관을 사용자 정의합니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>다크 모드</Label>
              <p className="text-muted-foreground text-sm">어두운 테마를 사용합니다.</p>
            </div>
            <Switch
              checked={theme === "dark"}
              onCheckedChange={(v) => setTheme(v ? "dark" : "light")}
            />
          </div>
        </CardContent>
      </Card>

      {/* 저장 버튼 */}
      <div className="flex justify-end">
        <Button>
          <Settings className="mr-2 h-4 w-4" />
          설정 저장
        </Button>
      </div>
    </div>
  );
}
