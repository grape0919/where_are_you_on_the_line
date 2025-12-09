"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Users, UserPlus, FileText, Plus, Edit, Trash2, Save, X, AlertTriangle } from "lucide-react";
import { Collapse } from "@/components/ui/collapse";
import {
  ensureDefaultPatients,
  generateNextPatientId,
  getPatientsWithNormalizedIds,
  setJSON,
} from "@/lib/storage";
import { LS_KEYS } from "@/lib/constants";
import type { PatientItem } from "@/types/domain";

// types imported

export default function PatientsPage() {
  const [patients, setPatients] = useState<PatientItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPatient, setEditingPatient] = useState<PatientItem | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    age: "",
    phone: "",
    notes: "",
  });

  // 환자 목록 조회
  const fetchPatients = async () => {
    try {
      ensureDefaultPatients();
      const list = getPatientsWithNormalizedIds();
      setPatients(list);
    } catch (error) {
      console.error("환자 조회 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  // 환자 저장
  const savePatients = (newPatients: PatientItem[]) => {
    setJSON(LS_KEYS.patients, newPatients);
    setPatients(newPatients);
  };

  // 환자 추가
  const addPatient = () => {
    if (!formData.name || !formData.age || !formData.phone) {
      alert("이름, 나이, 연락처를 모두 입력해주세요.");
      return;
    }

    const newPatient: PatientItem = {
      id: generateNextPatientId(patients),
      name: formData.name,
      age: parseInt(formData.age),
      phone: formData.phone,
      lastVisit: new Date().toISOString().split("T")[0],
      isActive: true,
      notes: formData.notes,
    };

    const updatedPatients = [...patients, newPatient];
    savePatients(updatedPatients);
    resetForm();
    setIsAdding(false);
  };

  // 환자 수정
  const updatePatient = () => {
    if (!editingPatient || !formData.name || !formData.age || !formData.phone) {
      alert("필수 정보를 모두 입력해주세요.");
      return;
    }

    const updatedPatients = patients.map((patient) =>
      patient.id === editingPatient.id
        ? {
            ...patient,
            name: formData.name,
            age: parseInt(formData.age),
            phone: formData.phone,
            notes: formData.notes,
          }
        : patient
    );

    savePatients(updatedPatients);
    resetForm();
    setEditingPatient(null);
  };

  // 환자 삭제
  const deletePatient = (id: string) => {
    if (confirm("정말로 이 환자를 삭제하시겠습니까?")) {
      const updatedPatients = patients.filter((patient) => patient.id !== id);
      savePatients(updatedPatients);
    }
  };

  // 환자 상태 토글
  const togglePatientStatus = (id: string) => {
    const updatedPatients = patients.map((patient) =>
      patient.id === id ? { ...patient, isActive: !patient.isActive } : patient
    );
    savePatients(updatedPatients);
  };

  // 편집 시작
  const startEdit = (patient: PatientItem) => {
    setEditingPatient(patient);
    setFormData({
      name: patient.name,
      age: patient.age.toString(),
      phone: patient.phone,
      notes: patient.notes || "",
    });
  };

  // 편집 취소
  const cancelEdit = () => {
    setEditingPatient(null);
    resetForm();
  };

  // 추가 시작
  const startAdd = () => {
    setIsAdding(true);
    resetForm();
  };

  // 추가 취소
  const cancelAdd = () => {
    setIsAdding(false);
    resetForm();
  };

  // 폼 초기화
  const resetForm = () => {
    setFormData({
      name: "",
      age: "",
      phone: "",
      notes: "",
    });
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="text-center">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* 환자 관리 개요 */}
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
            <div className="text-2xl font-bold text-blue-600">
              {
                patients.filter((p) => p.lastVisit === new Date().toISOString().split("T")[0])
                  .length
              }
            </div>
            <p className="text-muted-foreground text-xs">오늘</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">활성 환자</CardTitle>
            <FileText className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {patients.filter((p) => p.isActive).length}
            </div>
            <p className="text-muted-foreground text-xs">명</p>
          </CardContent>
        </Card>
      </div>

      {/* 알림 */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          환자 정보를 수정하면 기존 진료 기록에 영향을 줄 수 있습니다.
        </AlertDescription>
      </Alert>

      {/* 환자 목록 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>환자 목록</CardTitle>
              <CardDescription>
                현재 등록된 환자들입니다. 수정하거나 삭제할 수 있습니다.
              </CardDescription>
            </div>
            <Button onClick={startAdd}>
              <Plus className="mr-2 h-4 w-4" />
              환자 추가
            </Button>
          </div>
        </CardHeader>
        <CardContent>
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
                  {/* 환자 정보 표시 */}
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="mb-2 flex items-center gap-4">
                          <div className="font-medium">{patient.name}</div>
                          <Badge variant="outline">{patient.age}세</Badge>
                          <Badge variant="secondary">{patient.phone}</Badge>
                          {!patient.isActive && <Badge variant="destructive">비활성</Badge>}
                        </div>
                        <div className="text-muted-foreground space-y-1 text-sm">
                          <div>ID: {patient.id}</div>
                          <div>최근 방문: {patient.lastVisit}</div>
                          {patient.notes && <div>메모: {patient.notes}</div>}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => togglePatientStatus(patient.id)}
                          variant="outline"
                          size="sm"
                        >
                          {patient.isActive ? "비활성화" : "활성화"}
                        </Button>
                        <Button onClick={() => startEdit(patient)} variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => deletePatient(patient.id)}
                          variant="outline"
                          size="sm"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* 편집 폼 (Collapse 적용) */}
                  <Collapse open={editingPatient?.id === patient.id} className="bg-white">
                    <div className="space-y-4 px-4 pt-2 pb-4">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor={`name-${patient.id}`} className="text-sm font-medium">
                            이름 *
                          </Label>
                          <Input
                            id={`name-${patient.id}`}
                            placeholder="예: 김환자"
                            value={formData.name}
                            onChange={(e) =>
                              setFormData((prev) => ({ ...prev, name: e.target.value }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`age-${patient.id}`} className="text-sm font-medium">
                            나이 *
                          </Label>
                          <Input
                            id={`age-${patient.id}`}
                            type="number"
                            placeholder="예: 45"
                            value={formData.age}
                            onChange={(e) =>
                              setFormData((prev) => ({ ...prev, age: e.target.value }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`phone-${patient.id}`} className="text-sm font-medium">
                            연락처 *
                          </Label>
                          <Input
                            id={`phone-${patient.id}`}
                            placeholder="예: 010-1234-5678"
                            value={formData.phone}
                            onChange={(e) =>
                              setFormData((prev) => ({ ...prev, phone: e.target.value }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`notes-${patient.id}`} className="text-sm font-medium">
                            메모
                          </Label>
                          <Input
                            id={`notes-${patient.id}`}
                            placeholder="예: 정형외과 진료"
                            value={formData.notes}
                            onChange={(e) =>
                              setFormData((prev) => ({ ...prev, notes: e.target.value }))
                            }
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-3 pt-2">
                        <Button onClick={cancelEdit} variant="outline" size="sm">
                          <X className="mr-2 h-4 w-4" />
                          취소
                        </Button>
                        <Button onClick={updatePatient} size="sm">
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
            <CardTitle>환자 추가</CardTitle>
            <CardDescription>새로운 환자를 추가합니다.</CardDescription>
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
                    placeholder="예: 김환자"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="age" className="text-sm font-medium">
                    나이 *
                  </Label>
                  <Input
                    id="age"
                    type="number"
                    placeholder="예: 45"
                    value={formData.age}
                    onChange={(e) => setFormData((prev) => ({ ...prev, age: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-medium">
                    연락처 *
                  </Label>
                  <Input
                    id="phone"
                    placeholder="예: 010-1234-5678"
                    value={formData.phone}
                    onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes" className="text-sm font-medium">
                    메모
                  </Label>
                  <Input
                    id="notes"
                    placeholder="예: 정형외과 진료"
                    value={formData.notes}
                    onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button onClick={cancelAdd} variant="outline">
                  <X className="mr-2 h-4 w-4" />
                  취소
                </Button>
                <Button onClick={addPatient}>
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
