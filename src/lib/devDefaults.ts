export function devPrefillEnabled(): boolean {
  return process.env.NEXT_PUBLIC_DEV_PREFILL === "true" && process.env.NODE_ENV !== "production";
}

export function getRegisterPrefill() {
  if (!devPrefillEnabled()) return null;
  return {
    name: "테스트환자",
    age: "30",
    service: "일반진료",
    room: "101",
    doctor: "김의사",
  } as const;
}

export function getReservationPrefill() {
  if (!devPrefillEnabled()) return null;
  const today = new Date().toISOString().split("T")[0];
  return {
    name: "테스트환자",
    patientId: "P0001",
    phone: "010-0000-0000",
    service: "일반진료",
    date: today,
    timeSlot: "09:00",
  } as const;
}

export function getTokenPrefill() {
  if (!devPrefillEnabled()) return "";
  return "Q-DEV-TOKEN-000001";
}
