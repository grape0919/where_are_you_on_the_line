"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Edit, Trash2, Save, X, AlertTriangle, RefreshCw } from "lucide-react";
import type { SpecialtyItem } from "@/types/domain";
import { Collapse } from "@/components/ui/collapse";
import { useSpecialties, useSpecialtyMutations, useDoctors } from "@/lib/useMasterData";
import { SpecialtyQuickAdd } from "@/components/admin/specialty-quick-add";
import { toast } from "sonner";
import { useConfirm } from "@/components/confirm-dialog";

export default function SpecialtiesPage() {
  const confirm = useConfirm();
  const { data: specialties = [], isLoading } = useSpecialties(false);
  const { data: doctors = [] } = useDoctors(false);
  const { create, update, remove } = useSpecialtyMutations();

  const [editing, setEditing] = useState<SpecialtyItem | null>(null);
  const [formName, setFormName] = useState("");

  // specialty 이름별 활성 의사 수
  const doctorCountByName = new Map<string, number>();
  for (const d of doctors) {
    if (!d.isActive) continue;
    doctorCountByName.set(d.specialty, (doctorCountByName.get(d.specialty) ?? 0) + 1);
  }

  const handleUpdate = async () => {
    if (!editing) return;
    const name = formName.trim();
    if (!name) {
      toast.error("전문과목 이름을 입력해주세요.");
      return;
    }
    try {
      await update.mutateAsync({ id: editing.id, name });
      toast.success(
        name !== editing.name
          ? `"${editing.name}" → "${name}" (의사 정보 자동 갱신됨)`
          : "수정되었습니다"
      );
      setEditing(null);
      setFormName("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "수정 실패");
    }
  };

  const handleDelete = async (item: SpecialtyItem) => {
    const inUse = doctorCountByName.get(item.name) ?? 0;
    const description =
      inUse > 0
        ? `현재 ${inUse}명의 활성 의사가 '${item.name}'을 사용 중입니다. 그래도 비활성 처리하시겠습니까? (의사 데이터는 유지됩니다)`
        : "비활성 처리되며 기록은 보존됩니다. 계속하시겠습니까?";

    const ok = await confirm({
      title: `전문과목 '${item.name}' 삭제`,
      description,
      confirmText: "삭제",
      destructive: true,
    });
    if (!ok) return;
    try {
      await remove.mutateAsync({ id: item.id, force: inUse > 0 });
      toast.success("삭제되었습니다");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "삭제 실패");
    }
  };

  const toggleActive = async (item: SpecialtyItem) => {
    try {
      await update.mutateAsync({ id: item.id, isActive: !item.isActive });
      toast.success(item.isActive ? "비활성화됨" : "활성화됨");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "상태 변경 실패");
    }
  };

  const startEdit = (item: SpecialtyItem) => {
    setEditing(item);
    setFormName(item.name);
  };

  const cancelEdit = () => {
    setEditing(null);
    setFormName("");
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <RefreshCw className="mx-auto mb-4 h-8 w-8 animate-spin" />
          <p>전문과목 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          전문과목 이름을 변경하면 해당 전문과목을 사용하는 의사의 정보도 자동으로 갱신됩니다.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>전문과목 목록</CardTitle>
          <CardDescription>
            의사 추가/수정 시 선택할 수 있는 전문과목 목록입니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SpecialtyQuickAdd
            existingSpecialties={specialties}
            onAdd={async (name) => {
              try {
                await create.mutateAsync({ name });
                toast.success(`${name} 추가됨`);
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "추가 실패");
                throw err;
              }
            }}
            isPending={create.isPending}
          />
          {specialties.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">등록된 전문과목이 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {specialties.map((item) => {
                const inUse = doctorCountByName.get(item.name) ?? 0;
                return (
                  <div
                    key={item.id}
                    className={`rounded-lg border ${!item.isActive ? "opacity-60" : ""}`}
                  >
                    <div className="p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="font-medium">{item.name}</div>
                          <Badge variant="secondary">의사 {inUse}명</Badge>
                          {!item.isActive && <Badge variant="destructive">비활성</Badge>}
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={() => toggleActive(item)} variant="outline" size="sm">
                            {item.isActive ? "비활성화" : "활성화"}
                          </Button>
                          <Button onClick={() => startEdit(item)} variant="outline" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button onClick={() => handleDelete(item)} variant="outline" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    <Collapse open={editing?.id === item.id} className="bg-white">
                      <div className="space-y-4 px-4 pt-2 pb-4">
                        <div className="space-y-2">
                          <Label>전문과목 이름 *</Label>
                          <Input
                            value={formName}
                            onChange={(e) => setFormName(e.target.value)}
                            maxLength={30}
                            autoFocus
                          />
                        </div>
                        <div className="flex justify-end gap-3">
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
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
