"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Edit, Trash2, Save, X, AlertTriangle } from "lucide-react";
import { ensureDefaultDoctors, getJSON, setJSON } from "@/lib/storage";
import { LS_KEYS } from "@/lib/constants";
import type { DoctorItem } from "@/types/domain";
import { Collapse } from "@/components/ui/collapse";

// types imported

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<DoctorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingDoctor, setEditingDoctor] = useState<DoctorItem | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    specialty: "",
    room: "",
    phone: "",
    email: "",
  });

  // 의료진 목록 조회
  const fetchDoctors = async () => {
    try {
      ensureDefaultDoctors();
      const list = getJSON<DoctorItem[]>(LS_KEYS.doctors) || [];
      setDoctors(list);
    } catch (error) {
      console.error("의료진 조회 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  // 의료진 저장
  const saveDoctors = (newDoctors: DoctorItem[]) => {
    setJSON(LS_KEYS.doctors, newDoctors);
    setDoctors(newDoctors);
  };

  // 의료진 추가
  const addDoctor = () => {
    if (!formData.name || !formData.specialty || !formData.room) {
      alert("이름, 진료과목, 진료실을 모두 입력해주세요.");
      return;
    }

    const newDoctor: DoctorItem = {
      id: Date.now().toString(),
      name: formData.name,
      specialty: formData.specialty,
      room: formData.room,
      phone: formData.phone || undefined,
      email: formData.email || undefined,
      isActive: true,
    };

    const updatedDoctors = [...doctors, newDoctor];
    saveDoctors(updatedDoctors);

    // 폼 초기화
    setFormData({ name: "", specialty: "", room: "", phone: "", email: "" });
    setIsAdding(false);
  };

  // 의료진 수정
  const updateDoctor = () => {
    if (!editingDoctor || !formData.name || !formData.specialty || !formData.room) {
      alert("이름, 진료과목, 진료실을 모두 입력해주세요.");
      return;
    }

    const updatedDoctors = doctors.map((doctor) =>
      doctor.id === editingDoctor.id
        ? {
            ...doctor,
            name: formData.name,
            specialty: formData.specialty,
            room: formData.room,
            phone: formData.phone || undefined,
            email: formData.email || undefined,
          }
        : doctor
    );

    saveDoctors(updatedDoctors);

    // 편집 모드 종료
    setEditingDoctor(null);
    setFormData({ name: "", specialty: "", room: "", phone: "", email: "" });
  };

  // 의료진 삭제
  const deleteDoctor = (id: string) => {
    if (!confirm("정말로 이 의료진을 삭제하시겠습니까?")) return;

    const updatedDoctors = doctors.filter((doctor) => doctor.id !== id);
    saveDoctors(updatedDoctors);
  };

  // 의료진 활성화/비활성화 토글
  const toggleDoctorStatus = (id: string) => {
    const updatedDoctors = doctors.map((doctor) =>
      doctor.id === id ? { ...doctor, isActive: !doctor.isActive } : doctor
    );
    saveDoctors(updatedDoctors);
  };

  // 편집 모드 시작
  const startEdit = (doctor: DoctorItem) => {
    setEditingDoctor(doctor);
    setFormData({
      name: doctor.name,
      specialty: doctor.specialty,
      room: doctor.room,
      phone: doctor.phone || "",
      email: doctor.email || "",
    });
    setIsAdding(false);
  };

  // 편집 취소
  const cancelEdit = () => {
    setEditingDoctor(null);
    setFormData({ name: "", specialty: "", room: "", phone: "", email: "" });
    setIsAdding(false);
  };

  // 추가 모드 시작
  const startAdd = () => {
    setIsAdding(true);
    setEditingDoctor(null);
    setFormData({ name: "", specialty: "", room: "", phone: "", email: "" });
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
          <p>의료진 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* 알림 */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          의료진 정보를 수정하면 기존 대기열의 담당의 정보에 영향을 줄 수 있습니다.
        </AlertDescription>
      </Alert>

      {/* 의료진 목록 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>의료진 목록</CardTitle>
              <CardDescription>
                현재 등록된 의료진들입니다. 수정하거나 삭제할 수 있습니다.
              </CardDescription>
            </div>
            <Button onClick={startAdd}>
              <Plus className="mr-2 h-4 w-4" />
              의료진 추가
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {doctors.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">등록된 의료진이 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {doctors.map((doctor) => (
                <div
                  key={doctor.id}
                  className={`rounded-lg border ${!doctor.isActive ? "opacity-60" : ""}`}
                >
                  {/* 의료진 정보 표시 */}
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="mb-2 flex items-center gap-4">
                          <div className="font-medium">{doctor.name}</div>
                          <Badge variant="outline">{doctor.specialty}</Badge>
                          <Badge variant="secondary">{doctor.room}호</Badge>
                          {!doctor.isActive && <Badge variant="destructive">비활성</Badge>}
                        </div>
                        <div className="text-muted-foreground space-y-1 text-sm">
                          <div>ID: {doctor.id}</div>
                          {doctor.phone && <div>연락처: {doctor.phone}</div>}
                          {doctor.email && <div>이메일: {doctor.email}</div>}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => toggleDoctorStatus(doctor.id)}
                          variant="outline"
                          size="sm"
                        >
                          {doctor.isActive ? "비활성화" : "활성화"}
                        </Button>
                        <Button onClick={() => startEdit(doctor)} variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button onClick={() => deleteDoctor(doctor.id)} variant="outline" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* 편집 폼 (Collapse 적용) */}
                  <Collapse open={editingDoctor?.id === doctor.id} className="bg-white">
                    <div className="space-y-4 px-4 pt-2 pb-4">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor={`name-${doctor.id}`} className="text-sm font-medium">
                            이름 *
                          </Label>
                          <Input
                            id={`name-${doctor.id}`}
                            placeholder="예: 김의사"
                            value={formData.name}
                            onChange={(e) =>
                              setFormData((prev) => ({ ...prev, name: e.target.value }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`specialty-${doctor.id}`} className="text-sm font-medium">
                            진료과목 *
                          </Label>
                          <Input
                            id={`specialty-${doctor.id}`}
                            placeholder="예: 정형외과"
                            value={formData.specialty}
                            onChange={(e) =>
                              setFormData((prev) => ({ ...prev, specialty: e.target.value }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`room-${doctor.id}`} className="text-sm font-medium">
                            진료실 *
                          </Label>
                          <Input
                            id={`room-${doctor.id}`}
                            placeholder="예: 101"
                            value={formData.room}
                            onChange={(e) =>
                              setFormData((prev) => ({ ...prev, room: e.target.value }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`phone-${doctor.id}`} className="text-sm font-medium">
                            연락처
                          </Label>
                          <Input
                            id={`phone-${doctor.id}`}
                            placeholder="예: 010-1234-5678"
                            value={formData.phone}
                            onChange={(e) =>
                              setFormData((prev) => ({ ...prev, phone: e.target.value }))
                            }
                          />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor={`email-${doctor.id}`} className="text-sm font-medium">
                            이메일
                          </Label>
                          <Input
                            id={`email-${doctor.id}`}
                            type="email"
                            placeholder="예: doctor@allright.com"
                            value={formData.email}
                            onChange={(e) =>
                              setFormData((prev) => ({ ...prev, email: e.target.value }))
                            }
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-3 pt-2">
                        <Button onClick={cancelEdit} variant="outline" size="sm">
                          <X className="mr-2 h-4 w-4" />
                          취소
                        </Button>
                        <Button onClick={updateDoctor} size="sm">
                          <Save className="mr-2 h-4 w-4" />
                          저장
                        </Button>
                      </div>
                    </div>
                  </Collapse>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 추가 폼 */}
      {isAdding && (
        <Card>
          <CardHeader>
            <CardTitle>의료진 추가</CardTitle>
            <CardDescription>새로운 의료진을 추가합니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium">
                    이름 *
                  </Label>
                  <Input
                    id="name"
                    placeholder="예: 김의사"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="specialty" className="text-sm font-medium">
                    진료과목 *
                  </Label>
                  <Input
                    id="specialty"
                    placeholder="예: 정형외과"
                    value={formData.specialty}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, specialty: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="room" className="text-sm font-medium">
                    진료실 *
                  </Label>
                  <Input
                    id="room"
                    placeholder="예: 101"
                    value={formData.room}
                    onChange={(e) => setFormData((prev) => ({ ...prev, room: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-medium">
                    연락처
                  </Label>
                  <Input
                    id="phone"
                    placeholder="예: 010-1234-5678"
                    value={formData.phone}
                    onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="email" className="text-sm font-medium">
                    이메일
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="예: doctor@allright.com"
                    value={formData.email}
                    onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button onClick={cancelEdit} variant="outline">
                  <X className="mr-2 h-4 w-4" />
                  취소
                </Button>
                <Button onClick={addDoctor}>
                  <Save className="mr-2 h-4 w-4" />
                  추가
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
