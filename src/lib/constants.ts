export const QUEUE_STATUS_LABELS: Record<string, string> = {
  confirmed: "대기 중",
  in_progress: "진료중",
  completed: "진료완료",
  cancelled: "취소",
};

export const QUEUE_STATUS_COLORS: Record<string, string> = {
  confirmed: "bg-primary/10 text-primary",
  in_progress: "bg-orange-100 text-orange-800",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-500",
};
