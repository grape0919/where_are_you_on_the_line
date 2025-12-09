export const SERVICE_WAIT_TIMES: Record<string, number> = {
  일반진료: 10,
  재진: 5,
  검사: 15,
  처방: 3,
};

export const DEFAULT_SERVICE_OPTIONS = [
  { value: "일반진료", label: "일반진료", waitTime: SERVICE_WAIT_TIMES["일반진료"] },
  { value: "재진", label: "재진", waitTime: SERVICE_WAIT_TIMES["재진"] },
  { value: "검사", label: "검사", waitTime: SERVICE_WAIT_TIMES["검사"] },
  { value: "처방", label: "처방", waitTime: SERVICE_WAIT_TIMES["처방"] },
] as const;

export const PATIENT_ID_PREFIX = "P";
export const PATIENT_ID_PAD_LENGTH = 4;

export const LS_KEYS = {
  services: "services",
  doctors: "doctors",
  patients: "patients",
  reservations: "reservations",
  reservationCapacity: "reservationCapacity",
} as const;

export const WEEKDAYS = [
  { value: "ALL", label: "전체 요일" },
  { value: "MON", label: "월요일" },
  { value: "TUE", label: "화요일" },
  { value: "WED", label: "수요일" },
  { value: "THU", label: "목요일" },
  { value: "FRI", label: "금요일" },
  { value: "SAT", label: "토요일" },
  { value: "SUN", label: "일요일" },
] as const;

export const RESERVATION_TIME_SLOTS = [
  { value: "09:00", label: "09:00" },
  { value: "09:30", label: "09:30" },
  { value: "10:00", label: "10:00" },
  { value: "10:30", label: "10:30" },
  { value: "11:00", label: "11:00" },
  { value: "13:00", label: "13:00" },
  { value: "13:30", label: "13:30" },
  { value: "14:00", label: "14:00" },
  { value: "14:30", label: "14:30" },
  { value: "15:00", label: "15:00" },
] as const;
