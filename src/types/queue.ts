export const QUEUE_STATUSES = {
  confirmed: "confirmed",
  in_progress: "in_progress",
  completed: "completed",
  cancelled: "cancelled",
} as const;

export type QueueStatus = (typeof QUEUE_STATUSES)[keyof typeof QUEUE_STATUSES];

export type QueueData = {
  token: string;
  patientId?: number | null; // 환자 마스터 FK
  name: string;
  phone: string;
  treatmentItems: string[]; // 진료항목 복수 선택 (e.g. ["일반진료", "검사"])
  totalEstimatedMinutes: number; // 이 환자의 진료 소요시간 합계
  doctor?: string;
  room?: string;
  status: QueueStatus;
  estimatedWaitTime: number; // 큐 깊이 기반 대기시간 (앞 환자들의 소요시간 합계)
  queuePosition: number; // 대기 순서 (1-based)
  patientsAhead: number; // 앞에 대기 중인 환자 수
  createdAt: number; // epoch ms
  updatedAt: number; // epoch ms
  confirmedAt?: number; // epoch ms
  inProgressAt?: number; // epoch ms (진료 시작)
  completedAt?: number; // epoch ms
  cancelledAt?: number; // epoch ms
  cancelReason?: string;
};

export type QueueState = QueueData & {
  eta: number; // remaining minutes (실시간 계산)
};

// 관리자 대시보드용 (API list 응답에 elapsedMinutes 포함)
export type QueueItem = QueueData & {
  elapsedMinutes: number;
};
