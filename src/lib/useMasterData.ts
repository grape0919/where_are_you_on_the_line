"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  ServiceItem,
  ServiceStat,
  DoctorItem,
  PatientItem,
  SpecialtyItem,
} from "@/types/domain";

// ─ Services ────────────────────────────────────────────
export function useServices(activeOnly = true) {
  return useQuery<ServiceItem[]>({
    queryKey: ["services", { activeOnly }],
    queryFn: async () => {
      const res = await fetch(`/api/services?activeOnly=${activeOnly}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch services");
      const data = await res.json();
      return data.services;
    },
    staleTime: 30_000,
  });
}

export function useServiceMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["services"] });

  const create = useMutation({
    mutationFn: async (input: Partial<ServiceItem>) => {
      const res = await fetch("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to create");
      return res.json();
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async (input: Partial<ServiceItem> & { id: number }) => {
      const res = await fetch("/api/services", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to update");
      return res.json();
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/services?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: invalidate,
  });

  return { create, update, remove };
}

export function useServiceStats() {
  return useQuery<{ stats: ServiceStat[]; minSamples: number }>({
    queryKey: ["service-stats"],
    queryFn: async () => {
      const res = await fetch("/api/services/stats", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch service stats");
      return res.json();
    },
    staleTime: 30_000,
  });
}

export function useApplyAutoUpdate() {
  const qc = useQueryClient();
  return useMutation<
    {
      updated: number;
      skipped: number;
      details: Array<{
        value: string;
        label: string;
        before: number;
        after: number | null;
        sampleSize: number;
        skipped: boolean;
      }>;
    },
    Error,
    void
  >({
    mutationFn: async () => {
      const res = await fetch("/api/services/apply-auto", { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to apply");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["services"] });
      qc.invalidateQueries({ queryKey: ["service-stats"] });
    },
  });
}

// ─ Specialties ─────────────────────────────────────────
export function useSpecialties(activeOnly = true) {
  return useQuery<SpecialtyItem[]>({
    queryKey: ["specialties", { activeOnly }],
    queryFn: async () => {
      const res = await fetch(`/api/specialties?activeOnly=${activeOnly}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch specialties");
      const data = await res.json();
      return data.specialties;
    },
    staleTime: 30_000,
  });
}

export function useSpecialtyMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["specialties"] });
    qc.invalidateQueries({ queryKey: ["doctors"] }); // 이름 변경 시 doctor.specialty도 영향
  };

  const create = useMutation({
    mutationFn: async (input: Partial<SpecialtyItem>) => {
      const res = await fetch("/api/specialties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to create");
      return res.json();
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async (input: Partial<SpecialtyItem> & { id: number }) => {
      const res = await fetch("/api/specialties", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to update");
      return res.json();
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async ({ id, force }: { id: number; force?: boolean }) => {
      const res = await fetch(`/api/specialties?id=${id}${force ? "&force=true" : ""}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string; inUseCount?: number };
        const err = new Error(data.error ?? "Failed to delete") as Error & {
          inUseCount?: number;
        };
        err.inUseCount = data.inUseCount;
        throw err;
      }
      return res.json();
    },
    onSuccess: invalidate,
  });

  return { create, update, remove };
}

// ─ Doctors ─────────────────────────────────────────────
export function useDoctors(activeOnly = true) {
  return useQuery<DoctorItem[]>({
    queryKey: ["doctors", { activeOnly }],
    queryFn: async () => {
      const res = await fetch(`/api/doctors?activeOnly=${activeOnly}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch doctors");
      const data = await res.json();
      return data.doctors;
    },
    staleTime: 30_000,
  });
}

export function useDoctorMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["doctors"] });

  const create = useMutation({
    mutationFn: async (input: Partial<DoctorItem>) => {
      const res = await fetch("/api/doctors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to create");
      return res.json();
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async (input: Partial<DoctorItem> & { id: number }) => {
      const res = await fetch("/api/doctors", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to update");
      return res.json();
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/doctors?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: invalidate,
  });

  return { create, update, remove };
}

// ─ Patients ────────────────────────────────────────────
export function usePatients(activeOnly = true) {
  return useQuery<PatientItem[]>({
    queryKey: ["patients", { activeOnly }],
    queryFn: async () => {
      const res = await fetch(`/api/patients?activeOnly=${activeOnly}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch patients");
      const data = await res.json();
      return data.patients;
    },
    staleTime: 30_000,
  });
}

export interface PatientHistoryItem {
  id: number;
  token: string;
  treatmentItems: string[];
  doctor: string | null;
  status: "confirmed" | "in_progress" | "completed" | "cancelled";
  createdAt: number;
  confirmedAt: number | null;
  inProgressAt: number | null;
  completedAt: number | null;
  cancelledAt: number | null;
  cancelReason: string | null;
  totalEstimatedMinutes: number;
}

export function usePatientHistory(patientId: number | null) {
  return useQuery<{ patient: PatientItem; history: PatientHistoryItem[] }>({
    queryKey: ["patient-history", patientId],
    queryFn: async () => {
      const res = await fetch(`/api/patients/${patientId}/history`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch history");
      return res.json();
    },
    enabled: patientId != null,
    staleTime: 10_000,
  });
}

/** 검색어 기반 조회 — 관리자 접수 폼에서 사용 */
export function usePatientSearch(query: string) {
  return useQuery<PatientItem[]>({
    queryKey: ["patients", "search", query],
    queryFn: async () => {
      const res = await fetch(`/api/patients?q=${encodeURIComponent(query)}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to search");
      const data = await res.json();
      return data.patients;
    },
    enabled: query.trim().length >= 1,
    staleTime: 10_000,
  });
}

export function usePatientMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["patients"] });

  const create = useMutation({
    mutationFn: async (input: Partial<PatientItem>) => {
      const res = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to create");
      return res.json();
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async (input: Partial<PatientItem> & { id: number }) => {
      const res = await fetch("/api/patients", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to update");
      return res.json();
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/patients?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: invalidate,
  });

  return { create, update, remove };
}
