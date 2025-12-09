export type ServiceItem = {
  id: string;
  value: string;
  label: string;
  waitTime: number;
  isActive: boolean;
};

export type DoctorItem = {
  id: string;
  name: string;
  specialty: string;
  room: string;
  isActive: boolean;
  phone?: string;
  email?: string;
};

export type PatientItem = {
  id: string;
  name: string;
  age: number;
  phone: string;
  lastVisit: string;
  isActive: boolean;
  notes?: string;
};

export type ReservationData = {
  reservationId: string;
  name: string;
  patientId: string;
  phone: string;
  service: string;
  date: string; // yyyy-mm-dd
  timeSlot: string; // HH:mm
  estimatedWaitTime: number;
  createdAt: number; // epoch ms
};

export type WeekdayToken = "ALL" | "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";

export type ReservationCapacityRule = {
  id: string;
  service: string; // service value or "ALL"
  dayOfWeek: WeekdayToken;
  perSlot?: number | null;
  perDay?: number | null;
  isActive: boolean;
  note?: string;
};
