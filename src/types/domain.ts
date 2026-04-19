export type ServiceItem = {
  id: number;
  value: string;
  label: string;
  waitTime: number;
  autoUpdate: boolean; // 실측 기반 자동 갱신 여부
  isActive: boolean;
  createdAt?: string; // ISO
  updatedAt?: string;
};

export type ServiceStat = {
  serviceId: number;
  value: string;
  label: string;
  waitTime: number; // 현재 설정값
  autoUpdate: boolean;
  sampleSize: number;
  avgMinutes: number | null; // 절사평균(상하위 10% 제거) — 표본 충분할 때만
  medianMinutes: number | null;
  minMinutes: number | null;
  maxMinutes: number | null;
};

export type SpecialtyItem = {
  id: number;
  name: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type DoctorItem = {
  id: number;
  name: string;
  specialty: string;
  room: string;
  phone?: string | null;
  email?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type PatientItem = {
  id: number;
  code: string; // "P0001" 외부 표기
  name: string;
  phone: string;
  age?: number | null;
  notes?: string | null;
  lastVisit?: string | null; // ISO
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type WeekdayToken = "ALL" | "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";

export type OperatingHoursRule = {
  dayOfWeek: WeekdayToken;
  openTime: string; // "09:00"
  closeTime: string; // "18:00"
  isClosed: boolean;
  hasLunch?: boolean;
  lunchStart?: string;
  lunchEnd?: string;
};
