"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Stethoscope, CheckCircle, XCircle } from "lucide-react";

interface StatsCardsProps {
  confirmed: number;
  inProgress: number;
  completed: number;
  cancelled: number;
}

export function StatsCards({ confirmed, inProgress, completed, cancelled }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">대기 중</CardTitle>
          <Clock className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary">
            {confirmed}
            <span className="text-muted-foreground ml-1 text-sm">명</span>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">진료중</CardTitle>
          <Stethoscope className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600">
            {inProgress}
            <span className="text-muted-foreground ml-1 text-sm">명</span>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">진료완료</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {completed}
            <span className="text-muted-foreground ml-1 text-sm">명</span>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">취소</CardTitle>
          <XCircle className="h-4 w-4 text-gray-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-500">
            {cancelled}
            <span className="text-muted-foreground ml-1 text-sm">건</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
