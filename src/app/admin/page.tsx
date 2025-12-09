"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Edit,
  Trash2,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
} from "lucide-react";

import { getActiveDoctors, getActiveServices } from "@/lib/storage";
import { formatMinutesCompact, formatTimeHM } from "@/lib/time";
import { LineChart } from "@/components/charts/LineChart";
import { AreaChart } from "@/components/charts/AreaChart";
import { BarChart } from "@/components/charts/BarChart";

type QueueItem = {
  token: string;
  name: string;
  age: number;
  service: string;
  room?: string;
  doctor?: string;
  eta: number;
  estimatedWaitTime: number;
  createdAt: number;
  updatedAt: number;
  elapsedMinutes: number;
  remainingWaitTime: number;
};

export default function AdminDashboard() {
  const [queues, setQueues] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editingQueue, setEditingQueue] = useState<QueueItem | null>(null);
  const [serviceOptions, setServiceOptions] = useState(getActiveServices());
  const [doctorOptions, setDoctorOptions] = useState<{ value: string; label: string }[]>([]);
  type EditForm = {
    name: string;
    age: string;
    service: string;
    room: string;
    doctor: string;
    estimatedWaitTime: string;
  };

  const [editForm, setEditForm] = useState<EditForm>({
    name: "",
    age: "",
    service: "",
    room: "",
    doctor: "",
    estimatedWaitTime: "",
  });

  // 진료항목 목록 조회
  const fetchServices = () => {
    try {
      setServiceOptions(getActiveServices());
    } catch (error) {
      console.error("진료항목 조회 실패:", error);
    }
  };

  // 의료진 목록 조회
  const fetchDoctors = () => {
    try {
      setDoctorOptions(getActiveDoctors());
    } catch (error) {
      console.error("의료진 조회 실패:", error);
    }
  };

  // 대기열 목록 조회
  const fetchQueues = async (showRefreshing = false) => {
    if (showRefreshing) {
      setRefreshing(true);
    }

    try {
      const response = await fetch("/api/queue?action=list", {
        method: "PATCH",
      });

      if (!response.ok) throw new Error("Failed to fetch queues");

      const data = await response.json();
      setQueues(data.queues);
    } catch (error) {
      console.error("대기열 조회 실패:", error);
    } finally {
      setLoading(false);
      if (showRefreshing) {
        // 새로고침 애니메이션을 위해 약간의 지연
        setTimeout(() => setRefreshing(false), 500);
      }
    }
  };

  // 대기열 업데이트
  const updateQueue = async (token: string, data: EditForm) => {
    try {
      const response = await fetch("/api/queue", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          ...data,
          age: parseInt(data.age),
          estimatedWaitTime: parseInt(data.estimatedWaitTime),
        }),
      });

      if (!response.ok) throw new Error("Failed to update queue");

      await fetchQueues();
      setEditingQueue(null);
    } catch (error) {
      console.error("대기열 업데이트 실패:", error);
      alert("업데이트에 실패했습니다.");
    }
  };

  // 대기열 삭제
  const deleteQueue = async (token: string) => {
    if (!confirm("정말로 이 대기열을 삭제하시겠습니까?")) return;

    try {
      const response = await fetch(`/api/queue?token=${encodeURIComponent(token)}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete queue");

      await fetchQueues();
    } catch (error) {
      console.error("대기열 삭제 실패:", error);
      alert("삭제에 실패했습니다.");
    }
  };

  // 즉시 완료 처리
  const completeQueue = async (token: string) => {
    if (!confirm("이 환자의 진료를 완료 처리하시겠습니까?")) return;

    try {
      const response = await fetch("/api/queue", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          estimatedWaitTime: 0, // 대기시간을 0으로 설정하여 완료 처리
        }),
      });

      if (!response.ok) throw new Error("Failed to complete queue");

      await fetchQueues();
    } catch (error) {
      console.error("완료 처리 실패:", error);
      alert("완료 처리에 실패했습니다.");
    }
  };

  // 편집 모드 시작
  const startEdit = (queue: QueueItem) => {
    setEditingQueue(queue);
    setEditForm({
      name: queue.name,
      age: queue.age.toString(),
      service: queue.service,
      room: queue.room || "",
      doctor: queue.doctor || "",
      estimatedWaitTime: queue.remainingWaitTime.toString(), // 현재 남은 시간을 기본값으로 설정
    });
  };

  // 편집 저장
  const handleSaveEdit = () => {
    if (!editingQueue) return;
    updateQueue(editingQueue.token, editForm);
  };

  // 편집 취소
  const cancelEdit = () => {
    setEditingQueue(null);
    setEditForm({
      name: "",
      age: "",
      service: "",
      room: "",
      doctor: "",
      estimatedWaitTime: "",
    });
  };

  // 대기열 보기
  const viewQueue = (token: string) => {
    window.open(`/queue?token=${encodeURIComponent(token)}`, "_blank");
  };

  // 수동 새로고침
  const handleRefresh = () => {
    fetchQueues(true);
  };

  useEffect(() => {
    fetchServices();
    fetchDoctors();
    fetchQueues();
    // 30초마다 자동 새로고침
    const interval = setInterval(() => fetchQueues(), 30000);
    return () => clearInterval(interval);
  }, []);

  const totalQueues = queues.length;
  const urgentQueues = queues.filter(
    (q) => q.remainingWaitTime <= 5 && q.remainingWaitTime > 0
  ).length;
  const completedQueues = queues.filter((q) => q.remainingWaitTime <= 0).length;

  const formatTime = formatMinutesCompact;
  const formatCreatedTime = formatTimeHM;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <RefreshCw className="mx-auto mb-4 h-8 w-8 animate-spin" />
          <p>대기열 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* 통계 카드 */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">전체 대기</CardTitle>
            <Users className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalQueues}
              <span className="text-muted-foreground ml-1 text-sm font-bold">명</span>
            </div>
            <p className="text-muted-foreground text-xs">현재 대기 중</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">임박 환자</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {urgentQueues}
              <span className="text-muted-foreground ml-1 text-sm font-bold">명</span>
            </div>
            <p className="text-muted-foreground text-xs">5분 이내</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">완료</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {completedQueues}
              <span className="text-muted-foreground ml-1 text-sm font-bold">명</span>
            </div>
            <p className="text-muted-foreground text-xs">진료 완료</p>
          </CardContent>
        </Card>
      </div>

      {/* 대기열 목록 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>대기열 현황</CardTitle>
              <CardDescription>
                현재 대기 중인 환자 목록입니다. 정보를 수정하거나 삭제할 수 있습니다.
              </CardDescription>
            </div>
            <Button
              onClick={handleRefresh}
              variant="outline"
              disabled={refreshing}
              className="min-w-[120px]"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "새로고침 중..." : "새로고침"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {queues.length === 0 ? (
            <div className="py-8 text-center">
              <Users className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
              <p className="text-muted-foreground">현재 대기 중인 환자가 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {queues.map((queue) => (
                <div key={queue.token} className="rounded-lg border">
                  {/* 대기열 정보 표시 */}
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="mb-2 flex items-center gap-4">
                          <div className="font-medium">{queue.name}</div>
                          <Badge variant="outline">({queue.age}세)</Badge>
                          <Badge variant="secondary">{queue.service}</Badge>
                          {queue.remainingWaitTime <= 5 && queue.remainingWaitTime > 0 && (
                            <Badge variant="destructive">임박</Badge>
                          )}
                          {queue.room && <Badge variant="outline">{queue.room}호</Badge>}
                          {queue.doctor && <Badge variant="outline">{queue.doctor}</Badge>}
                        </div>
                        <div className="text-muted-foreground space-y-1 text-sm">
                          <div>대기번호: {queue.token}</div>
                          <div>예상 대기시간: {queue.estimatedWaitTime}분</div>
                          <div>남은 대기시간: {queue.remainingWaitTime}분</div>
                          <div>접수 시간: {new Date(queue.createdAt).toLocaleTimeString()}</div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => startEdit(queue)} variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => deleteQueue(queue.token)}
                          variant="outline"
                          size="sm"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* 편집 폼 (접을 수 있는 스타일) */}
                  {editingQueue?.token === queue.token && (
                    <div className="overflow-hidden bg-white transition-all duration-700 ease-in-out">
                      <div className="animate-in fade-in-0 slide-in-from-top-2 transform space-y-4 px-4 pt-2 pb-4 transition-all duration-700 ease-in-out">
                        <div className="space-y-6">
                          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
                            <div className="space-y-2">
                              <Label htmlFor="name" className="text-sm font-medium">
                                이름
                              </Label>
                              <Input
                                id="name"
                                value={editForm.name}
                                onChange={(e) =>
                                  setEditForm((prev) => ({ ...prev, name: e.target.value }))
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="age" className="text-sm font-medium">
                                나이
                              </Label>
                              <Input
                                id="age"
                                type="number"
                                value={editForm.age}
                                onChange={(e) =>
                                  setEditForm((prev) => ({ ...prev, age: e.target.value }))
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="room" className="text-sm font-medium">
                                진료실
                              </Label>
                              <Input
                                id="room"
                                value={editForm.room}
                                onChange={(e) =>
                                  setEditForm((prev) => ({ ...prev, room: e.target.value }))
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="doctor" className="text-sm font-medium">
                                담당의
                              </Label>
                              <Select
                                value={editForm.doctor}
                                onValueChange={(value) => {
                                  setEditForm((prev) => ({ ...prev, doctor: value }));
                                  // 담당의 선택 시 해당 의료진의 진료실 정보를 자동으로 설정
                                  const selectedDoctor = doctorOptions.find(
                                    (option) => option.value === value
                                  );
                                  if (selectedDoctor) {
                                    const doctorName = selectedDoctor.value;
                                    const storedDoctors = localStorage.getItem("doctors");
                                    if (storedDoctors) {
                                      const doctors: { name: string; room: string }[] =
                                        JSON.parse(storedDoctors);
                                      const doctor = doctors.find((d) => d.name === doctorName);
                                      if (doctor) {
                                        setEditForm((prev) => ({ ...prev, room: doctor.room }));
                                      }
                                    }
                                  }
                                }}
                              >
                                <SelectTrigger id="doctor" className="w-full">
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
                          <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <Label htmlFor="service" className="text-sm font-medium">
                                진료 항목
                              </Label>
                              <Select
                                value={editForm.service}
                                onValueChange={(value) =>
                                  setEditForm((prev) => ({ ...prev, service: value }))
                                }
                              >
                                <SelectTrigger id="service" className="w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {serviceOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="estimatedWaitTime" className="text-sm font-medium">
                                예상 대기시간 (분)
                              </Label>
                              <Input
                                id="estimatedWaitTime"
                                type="number"
                                value={editForm.estimatedWaitTime}
                                onChange={(e) =>
                                  setEditForm((prev) => ({
                                    ...prev,
                                    estimatedWaitTime: e.target.value,
                                  }))
                                }
                              />
                            </div>
                          </div>
                          <div className="flex justify-end gap-3 pt-2">
                            <Button onClick={cancelEdit} variant="outline" size="sm">
                              취소
                            </Button>
                            <Button onClick={handleSaveEdit} size="sm">
                              저장
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 차트 샘플 섹션 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* 라인 차트 */}
        <Card>
          <CardHeader>
            <CardTitle>환자 추세 (30일)</CardTitle>
            <CardDescription>최근 30일 등록 수</CardDescription>
          </CardHeader>
          <CardContent>
            <LineChart />
          </CardContent>
          <CardFooter className="flex-col items-start gap-2 text-sm">
            <div className="flex gap-2 leading-none font-medium">
              Trending up by 5.2% this month <TrendingUp className="h-4 w-4" />
            </div>
            <div className="text-muted-foreground leading-none">
              Showing total visitors for the last 6 months
            </div>
          </CardFooter>
        </Card>

        {/* 에어리어 차트 */}
        <Card>
          <CardHeader>
            <CardTitle>대기 시간 추세 (예시)</CardTitle>
            <CardDescription>평균 대기시간 가상의 수치</CardDescription>
          </CardHeader>
          <CardContent>
            <AreaChart />
          </CardContent>
          <CardFooter>
            <div className="flex w-full items-start gap-2 text-sm">
              <div className="grid gap-2">
                <div className="flex items-center gap-2 leading-none font-medium">
                  Trending up by 5.2% this month <TrendingUp className="h-4 w-4" />
                </div>
                <div className="text-muted-foreground flex items-center gap-2 leading-none">
                  January - June 2024
                </div>
              </div>
            </div>
          </CardFooter>
        </Card>

        {/* 바 차트 */}
        <Card>
          <CardHeader>
            <CardTitle>시간대별 접수 수 (예시)</CardTitle>
            <CardDescription>09~18시</CardDescription>
          </CardHeader>
          <CardContent>
            <BarChart />
          </CardContent>
          <CardFooter className="flex-col items-start gap-2 text-sm">
            <div className="flex gap-2 leading-none font-medium">
              Trending up by 5.2% this month <TrendingUp className="h-4 w-4" />
            </div>
            <div className="text-muted-foreground leading-none">
              Showing total visitors for the last 6 months
            </div>
          </CardFooter>
        </Card>

        {/* 파이 차트 */}
        <Card>
          <CardHeader>
            <CardTitle>진료 항목 비중 (예시)</CardTitle>
            <CardDescription>일반/재진/검사/처방</CardDescription>
          </CardHeader>
          <CardContent>
            <BarChart />
          </CardContent>
          <CardFooter className="flex-col items-start gap-2 text-sm">
            <div className="flex gap-2 leading-none font-medium">
              Trending up by 5.2% this month <TrendingUp className="h-4 w-4" />
            </div>
            <div className="text-muted-foreground leading-none">
              Showing total visitors for the last 6 months
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
