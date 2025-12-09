import { NextRequest, NextResponse } from "next/server";
import type { QueueData } from "@/types/queue";
import { SERVICE_WAIT_TIMES } from "@/lib/constants";

import { InMemoryQueueStore, RedisQueueStore, computeRemainingWait } from "@/lib/queueStore";
import { isRedisEnabled } from "@/lib/env";

// 저장소 선택 (환경변수 기반)
const store = isRedisEnabled() ? new RedisQueueStore() : new InMemoryQueueStore();


// GET: 대기열 상태 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    const queueItem = store.get(token);

    if (!queueItem) {
      return NextResponse.json({ error: "Queue not found" }, { status: 404 });
    }

    // 현재 시간 기준으로 남은 대기 시간 계산
    const now = Date.now();
    const remainingWaitTime = computeRemainingWait(queueItem.createdAt, queueItem.estimatedWaitTime, now);

    return NextResponse.json({
      token: queueItem.token,
      name: queueItem.name,
      age: queueItem.age,
      service: queueItem.service,
      room: queueItem.room,
      doctor: queueItem.doctor,
      eta: remainingWaitTime,
      estimatedWaitTime: queueItem.estimatedWaitTime,
      createdAt: queueItem.createdAt,
      updatedAt: now,
    });
  } catch (error) {
    console.error("Queue API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: 새로운 대기열 등록
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, age, service, room, doctor } = body;

    if (!name || !age || !service) {
      return NextResponse.json({ error: "Name, age, and service are required" }, { status: 400 });
    }

    // 고유 토큰 생성
    const token = generateToken();
    const now = Date.now();
    const estimatedWaitTime = SERVICE_WAIT_TIMES[service] || 10;

    const queueItem: QueueData = {
      token,
      name,
      age,
      service,
      room,
      doctor,
      estimatedWaitTime,
      createdAt: now,
      updatedAt: now,
    };

    store.set(queueItem);

    return NextResponse.json({
      token,
      name,
      age,
      service,
      room,
      doctor,
      estimatedWaitTime,
      queueUrl: `/queue?token=${encodeURIComponent(token)}`,
    });
  } catch (error) {
    console.error("Queue creation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT: 대기열 정보 업데이트 (관리자용)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, name, age, service, room, doctor, estimatedWaitTime } = body;

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    const queueItem = store.get(token);

    if (!queueItem) {
      return NextResponse.json({ error: "Queue not found" }, { status: 404 });
    }

    // 업데이트 가능한 필드들만 수정
    const updatedItem = store.update(token, {
      name: name ?? queueItem.name,
      age: age ?? queueItem.age,
      service: service ?? queueItem.service,
      room: room ?? queueItem.room,
      doctor: doctor ?? queueItem.doctor,
      estimatedWaitTime: estimatedWaitTime ?? queueItem.estimatedWaitTime,
    });
    return NextResponse.json(updatedItem);
  } catch (error) {
    console.error("Queue update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE: 대기열 삭제
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    const deleted = store.delete(token);

    if (!deleted) {
      return NextResponse.json({ error: "Queue not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Queue deletion error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// 고유 토큰 생성 함수
function generateToken(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `Q-${timestamp}-${random}`.toUpperCase();
}

// 관리자용: 모든 대기열 조회
export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    if (action === "list") {
      const queues = store.list().map((item) => ({
        ...item,
        elapsedMinutes: Math.floor((Date.now() - item.createdAt) / (1000 * 60)),
        remainingWaitTime: computeRemainingWait(item.createdAt, item.estimatedWaitTime),
      }));

      return NextResponse.json({
        queues: queues.sort((a, b) => a.createdAt - b.createdAt),
        total: queues.length,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Queue list error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
