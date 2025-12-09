"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { ClipboardList, User2, Clock, CheckCircle, Copy, ExternalLink } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useCreateQueue } from "@/lib/useQueue";
import { getActiveDoctors, getActiveServices } from "@/lib/storage";
import { getRegisterPrefill } from "@/lib/devDefaults";

// 서비스/의료진 옵션은 storage 헬퍼를 통해 로드합니다.

export default function RegisterPage() {
  const [serviceOptions, setServiceOptions] = useState(getActiveServices());
  const [doctorOptions, setDoctorOptions] = useState<{ value: string; label: string }[]>([]);
  const prefill = getRegisterPrefill();
  const [formData, setFormData] = useState({
    name: prefill?.name ?? "",
    age: prefill?.age ?? "",
    service: prefill?.service ?? "",
    room: prefill?.room ?? "",
    doctor: prefill?.doctor ?? "",
  });

  const [successData, setSuccessData] = useState<{
    token: string;
    queueUrl: string;
    name: string;
    service: string;
    estimatedWaitTime: number;
  } | null>(null);

  const createQueueMutation = useCreateQueue();

  // 옵션 로더
  const fetchServices = () => {
    try {
      setServiceOptions(getActiveServices());
    } catch (error) {
      console.error("진료항목 조회 실패:", error);
    }
  };

  const fetchDoctors = () => {
    try {
      setDoctorOptions(getActiveDoctors());
    } catch (error) {
      console.error("의료진 조회 실패:", error);
    }
  };

  useEffect(() => {
    fetchServices();
    fetchDoctors();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.age || !formData.service) {
      alert("이름, 나이, 진료항목을 모두 입력해주세요.");
      return;
    }

    try {
      const result = await createQueueMutation.mutateAsync({
        name: formData.name,
        age: parseInt(formData.age),
        service: formData.service,
        room: formData.room || undefined,
        doctor: formData.doctor || undefined,
      });

      setSuccessData({
        token: result.token,
        queueUrl: result.queueUrl,
        name: result.name,
        service: result.service,
        estimatedWaitTime: result.estimatedWaitTime,
      });

      // 폼 초기화
      setFormData({
        name: "",
        age: "",
        service: "",
        room: "",
        doctor: "",
      });
    } catch (error) {
      console.error("접수 실패:", error);
      alert("접수 중 오류가 발생했습니다. 다시 시도해주세요.");
    }
  };

  const handleCopyUrl = async () => {
    if (!successData) return;

    try {
      const fullUrl = `${window.location.origin}${successData.queueUrl}`;
      await navigator.clipboard.writeText(fullUrl);
      alert("링크가 복사되었습니다!");
    } catch (error) {
      console.error("링크 복사 실패:", error);
      alert("링크 복사에 실패했습니다.");
    }
  };

  const handleOpenQueue = () => {
    if (!successData) return;
    window.open(successData.queueUrl, "_blank");
  };

  const selectedService = serviceOptions.find((option) => option.value === formData.service);

  return (
    <div className="flex min-h-[100dvh] w-full items-start justify-center bg-background px-4 py-6 sm:px-6 sm:py-8">
      <div className="w-full max-w-md space-y-4">
        <header className="flex items-center justify-between">
          <div className="text-center w-full">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">환자 접수</h1>
            <p className="text-muted-foreground mt-2">환자 정보를 입력하여 대기열에 등록하세요</p>
          </div>
          <ThemeToggle inline />
        </header>

        {!successData ? (
          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                접수 정보 입력
              </CardTitle>
              <CardDescription>환자의 기본 정보와 진료 항목을 입력해주세요</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">이름 *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="홍길동"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="age">나이 *</Label>
                    <Input
                      id="age"
                      type="number"
                      min="0"
                      max="150"
                      value={formData.age}
                      onChange={(e) => setFormData((prev) => ({ ...prev, age: e.target.value }))}
                      placeholder="30"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="service">진료 항목 *</Label>
                  <Select
                    value={formData.service}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, service: value }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="진료 항목을 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {serviceOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label} (예상 {option.waitTime}분)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="room">진료실</Label>
                    <Input
                      id="room"
                      value={formData.room}
                      onChange={(e) => setFormData((prev) => ({ ...prev, room: e.target.value }))}
                      placeholder="101"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="doctor">담당의</Label>
                    <Select
                      value={formData.doctor}
                      onValueChange={(value) => {
                        setFormData((prev) => ({ ...prev, doctor: value }));
                        // 담당의 선택 시 해당 의료진의 진료실 정보를 자동으로 설정
                        const selectedDoctor = doctorOptions.find(
                          (option) => option.value === value
                        );
                        if (selectedDoctor) {
                          const doctorName = selectedDoctor.value;
                          try {
                            const stored = window.localStorage.getItem("doctors");
                            if (stored) {
                              const doctors: { name: string; room: string }[] = JSON.parse(stored);
                              const doctor = doctors.find((d) => d.name === doctorName);
                              if (doctor) {
                                setFormData((prev) => ({ ...prev, room: doctor.room }));
                              }
                            }
                          } catch (e) {
                            console.error("의료진 조회 실패:", e);
                          }
                        }
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="담당의를 선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        {doctorOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {selectedService && (
                  <Alert>
                    <Clock className="h-4 w-4" />
                    <AlertTitle>예상 대기 시간</AlertTitle>
                    <AlertDescription>
                      {selectedService.label}의 예상 대기 시간은 {selectedService.waitTime}분입니다.
                    </AlertDescription>
                  </Alert>
                )}

                <Button type="submit" className="w-full" disabled={createQueueMutation.isPending}>
                  {createQueueMutation.isPending ? "접수 중..." : "접수 완료"}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                접수 완료
              </CardTitle>
              <CardDescription>환자가 대기열에 성공적으로 등록되었습니다</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">환자명</span>
                  <span className="font-medium">{successData.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">진료항목</span>
                  <span className="font-medium">{successData.service}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">예상 대기시간</span>
                  <span className="font-medium">{successData.estimatedWaitTime}분</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">대기번호</span>
                  <span className="font-mono font-medium">{successData.token}</span>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <p className="text-muted-foreground text-sm">
                  아래 링크를 환자에게 전달하여 대기 현황을 확인할 수 있습니다.
                </p>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleCopyUrl} className="flex-1">
                    <Copy className="mr-2 h-4 w-4" />
                    링크 복사
                  </Button>
                  <Button variant="outline" onClick={handleOpenQueue} className="flex-1">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    대기열 보기
                  </Button>
                </div>
              </div>

              <Button onClick={() => setSuccessData(null)} className="w-full" variant="secondary">
                새로운 접수
              </Button>
            </CardContent>
          </Card>
        )}

        <footer className="text-muted-foreground pt-2 text-center text-xs">
          © {new Date().getFullYear()} 올바른정형외과 · 대기열 시스템
        </footer>
      </div>
    </div>
  );
}
