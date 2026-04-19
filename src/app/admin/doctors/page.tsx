"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Edit, Trash2, Save, X, AlertTriangle, RefreshCw } from "lucide-react";
import type { DoctorItem } from "@/types/domain";
import { Collapse } from "@/components/ui/collapse";
import { useDoctors, useDoctorMutations, useSpecialties } from "@/lib/useMasterData";
import { DoctorQuickAdd } from "@/components/admin/doctor-quick-add";
import { toast } from "sonner";
import { useConfirm } from "@/components/confirm-dialog";

export default function DoctorsPage() {
  const confirm = useConfirm();
  const { data: doctors = [], isLoading } = useDoctors(false);
  const { data: specialties = [] } = useSpecialties(true);
  const { create, update, remove } = useDoctorMutations();

  const [editingDoctor, setEditingDoctor] = useState<DoctorItem | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    specialty: "",
    room: "",
    phone: "",
    email: "",
  });

  const handleUpdate = async () => {
    if (!editingDoctor) return;
    const name = formData.name.trim();
    const specialty = formData.specialty.trim();
    const room = formData.room.trim();
    if (!name || !specialty || !room) {
      toast.error("의사명, 진료과목, 진료실을 모두 입력해주세요.");
      return;
    }
    try {
      await update.mutateAsync({
        id: editingDoctor.id,
        name,
        specialty,
        room,
        phone: formData.phone.trim() || null,
        email: formData.email.trim() || null,
      });
      toast.success("수정되었습니다");
      setEditingDoctor(null);
      setFormData({ name: "", specialty: "", room: "", phone: "", email: "" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "수정 실패");
    }
  };

  const handleDelete = async (id: number) => {
    const ok = await confirm({
      title: "의료진 삭제",
      description: "비활성 처리되며 기존 진료 기록은 보존됩니다. 계속하시겠습니까?",
      confirmText: "삭제",
      destructive: true,
    });
    if (!ok) return;
    try {
      await remove.mutateAsync(id);
      toast.success("삭제되었습니다");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "삭제 실패");
    }
  };

  const toggleStatus = async (doctor: DoctorItem) => {
    try {
      await update.mutateAsync({ id: doctor.id, isActive: !doctor.isActive });
      toast.success(doctor.isActive ? "비활성화됨" : "활성화됨");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "상태 변경 실패");
    }
  };

  const startEdit = (doctor: DoctorItem) => {
    setEditingDoctor(doctor);
    setFormData({
      name: doctor.name,
      specialty: doctor.specialty,
      room: doctor.room,
      phone: doctor.phone || "",
      email: doctor.email || "",
    });
  };

  const cancelEdit = () => {
    setEditingDoctor(null);
    setFormData({ name: "", specialty: "", room: "", phone: "", email: "" });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <RefreshCw className="mx-auto mb-4 h-8 w-8 animate-spin" />
          <p>의료진 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          의료진 정보를 수정하면 기존 대기열의 담당의 정보에 영향을 줄 수 있습니다.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>의료진 목록</CardTitle>
          <CardDescription>
            의사명·진료과목·진료실을 입력하거나 전문과목 자동완성을 사용해서 바로 추가할 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <DoctorQuickAdd
            existingDoctors={doctors}
            onAdd={async (data) => {
              try {
                await create.mutateAsync({ ...data, isActive: true });
                toast.success(`${data.name} 추가됨`);
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "추가 실패");
                throw err;
              }
            }}
            isPending={create.isPending}
          />

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
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="mb-2 flex items-center gap-3">
                          <div className="font-medium">{doctor.name}</div>
                          <Badge variant="outline">{doctor.specialty}</Badge>
                          <Badge variant="secondary">{doctor.room}호</Badge>
                          {!doctor.isActive && <Badge variant="destructive">비활성</Badge>}
                        </div>
                        {(doctor.phone || doctor.email) && (
                          <div className="text-muted-foreground space-y-0.5 text-sm">
                            {doctor.phone && <div>연락처: {doctor.phone}</div>}
                            {doctor.email && <div>이메일: {doctor.email}</div>}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => toggleStatus(doctor)} variant="outline" size="sm">
                          {doctor.isActive ? "비활성화" : "활성화"}
                        </Button>
                        <Button onClick={() => startEdit(doctor)} variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button onClick={() => handleDelete(doctor.id)} variant="outline" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <Collapse open={editingDoctor?.id === doctor.id} className="bg-white">
                    <div className="space-y-4 px-4 pt-2 pb-4">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>의사명 *</Label>
                          <Input
                            value={formData.name}
                            onChange={(e) =>
                              setFormData((p) => ({ ...p, name: e.target.value }))
                            }
                            maxLength={20}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>진료과목 *</Label>
                          <Input
                            value={formData.specialty}
                            onChange={(e) =>
                              setFormData((p) => ({ ...p, specialty: e.target.value }))
                            }
                            maxLength={30}
                            list="specialty-options"
                          />
                          <datalist id="specialty-options">
                            {specialties.map((s) => (
                              <option key={s.id} value={s.name} />
                            ))}
                          </datalist>
                        </div>
                        <div className="space-y-2">
                          <Label>진료실 *</Label>
                          <Input
                            value={formData.room}
                            onChange={(e) =>
                              setFormData((p) => ({ ...p, room: e.target.value }))
                            }
                            maxLength={10}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>연락처</Label>
                          <Input
                            value={formData.phone}
                            onChange={(e) =>
                              setFormData((p) => ({ ...p, phone: e.target.value }))
                            }
                            maxLength={20}
                          />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label>이메일</Label>
                          <Input
                            type="email"
                            value={formData.email}
                            onChange={(e) =>
                              setFormData((p) => ({ ...p, email: e.target.value }))
                            }
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-3 pt-2">
                        <Button onClick={cancelEdit} variant="outline" size="sm">
                          <X className="mr-2 h-4 w-4" />
                          취소
                        </Button>
                        <Button onClick={handleUpdate} size="sm" disabled={update.isPending}>
                          <Save className="mr-2 h-4 w-4" />
                          {update.isPending ? "저장 중..." : "저장"}
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
    </div>
  );
}
