"use client";

import { Pie, PieChart as RechartsPieChart, Tooltip } from "recharts";

export function PieChart({ data }: { data: { label: string; value: number }[] }) {
  const colors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];
  const pieData = data.map((d, i) => ({ name: d.label, value: d.value, fill: colors[i % colors.length] }));
  return (
    <RechartsPieChart width={320} height={180}>
      <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={30} />
      <Tooltip />
    </RechartsPieChart>
  );
}

