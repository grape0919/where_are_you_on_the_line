"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Users,
  UserPlus,
  FileText,
  Edit,
  Trash2,
  Save,
  X,
  AlertTriangle,
  RefreshCw,
  History,
} from "lucide-react";
import { Collapse } from "@/components/ui/collapse";
import type { PatientItem } from "@/types/domain";
import { usePatients, usePatientMutations } from "@/lib/useMasterData";
import { PatientHistory } from "@/components/admin/patient-history";
import { PatientQuickAdd } from "@/components/admin/patient-quick-add";
import { toast } from "sonner";
import { useConfirm } from "@/components/confirm-dialog";

export default function PatientsPage() {
  const confirm = useConfirm();
  const { data: patients = [], isLoading } = usePatients(false);
  const { create, update, remove } = usePatientMutations();

  const [editingPatient, setEditingPatient] = useState<PatientItem | null>(null);
  const [historyPatientId, setHistoryPatientId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    age: "",
    phone: "",
    notes: "",
  });

  const resetForm = () =>
    setFormData({ name: "", age: "", phone: "", notes: "" });

  const handleUpdate = async () => {
    if (!editingPatient) return;
    if (!formData.name.trim() || !formData.phone.trim()) {
      toast.error("이름, 연락처를 입력해주세요.");
      return;
    }
    try {
      await update.mutateAsync({
        id: editingPatient.id,
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        age: formData.age ? parseInt(formData.age, 10) : null,
        notes: formData.notes.trim() || null,
      });
      toast.success("수정되었습니다");
      setEditingPatient(null);
      resetForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "수정 실패");
    }
  };

  const handleDelete = async (id: number) => {
    const ok = await confirm({
      title: "환자 삭제",
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

  const toggleStatus = async (patient: PatientItem) => {
    try {
      await update.mutateAsync({ id: patient.id, isActive: !patient.isActive });
      toast.success(patient.isActive ? "비활성화됨" : "활성화됨");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "상태 변경 실패");
    }
  };

  const startEdit = (patient: PatientItem) => {
    setEditingPatient(patient);
    setFormData({
      name: patient.name,
      age: patient.age?.toString() ?? "",
      phone: patient.phone,
      notes: patient.notes || "",
    });
  };

  const cancelEdit = () => {
    setEditingPatient(null);
    resetForm();
  };

  const today = new Date().toISOString().split("T")[0];
  const newTodayCount = patients.filter(
    (p) => p.createdAt?.startsWith(today ?? "")
  ).length;
  const activeCount = patients.filter((p) => p.isActive).length;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <RefreshCw className="mx-auto mb-4 h-8 w-8 animate-spin" />
          <p>환자 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* 환자 통계 */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">전체 환자</CardTitle>
            <Users className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{patients.length}</div>
            <p className="text-muted-foreground text-xs">명</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">신규 등록</CardTitle>
            <UserPlus className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{newTodayCount}</div>
            <p className="text-muted-foreground text-xs">오늘</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">활성 환자</CardTitle>
            <FileText className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeCount}</div>
            <p className="text-muted-foreground text-xs">명</p>
          </CardContent>
        </Card>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          환자 정보를 수정하면 기존 진료 기록에 영향을 줄 수 있습니다.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>환자 목록</CardTitle>
          <CardDescription>
            환자 접수 시 자동으로 등록되며, 수동 추가도 가능합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <PatientQuickAdd
            existingPatients={patients}
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
          {patients.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">등록된 환자가 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {patients.map((patient) => (
                <div
                  key={patient.id}
                  className={`rounded-lg border ${!patient.isActive ? "opacity-60" : ""}`}
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="mb-2 flex items-center gap-4">
                          <div className="font-medium">{patient.name}</div>
                          <Badge variant="outline">{patient.code}</Badge>
                          {patient.age && <Badge variant="outline">{patient.age}세</Badge>}
                          <Badge variant="secondary">{patient.phone}</Badge>
                          {!patient.isActive && <Badge variant="destructive">비활성</Badge>}
                        </div>
                        {patient.notes && (
                          <div className="text-muted-foreground text-sm">{patient.notes}</div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() =>
                            setHistoryPatientId((prev) =>
                              prev === patient.id ? null : patient.id
                            )
                          }
                          variant="outline"
                          size="sm"
                          aria-expanded={historyPatientId === patient.id}
                        >
                          <History className="mr-1 h-4 w-4" />
                          이력
                        </Button>
                        <Button onClick={() => toggleStatus(patient)} variant="outline" size="sm">
                          {patient.isActive ? "비활성화" : "활성화"}
                        </Button>
                        <Button onClick={() => startEdit(patient)} variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => handleDelete(patient.id)}
                          variant="outline"
                          size="sm"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <Collapse open={historyPatientId === patient.id} className="bg-white">
                    {historyPatientId === patient.id && (
                      <PatientHistory patientId={patient.id} />
                    )}
                  </Collapse>

                  <Collapse open={editingPatient?.id === patient.id} className="bg-white">
                    <div className="space-y-4 px-4 pt-2 pb-4">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>이름 *</Label>
                          <Input
                            value={formData.name}
                            onChange={(e) =>
                              setFormData((p) => ({ ...p, name: e.target.value }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>연락처 *</Label>
                          <Input
                            value={formData.phone}
                            onChange={(e) =>
                              setFormData((p) => ({ ...p, phone: e.target.value }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>나이</Label>
                          <Input
                            type="number"
                            value={formData.age}
                            onChange={(e) =>
                              setFormData((p) => ({ ...p, age: e.target.value }))
                            }
                          />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label>메모</Label>
                          <Input
                            value={formData.notes}
                            onChange={(e) =>
                              setFormData((p) => ({ ...p, notes: e.target.value }))
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
