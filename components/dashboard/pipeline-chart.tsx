"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { STAGE_STYLES } from "@/lib/ui/status";
import { formatCurrency } from "@/lib/ui/format";

export interface PipelineDatum {
  stage: string;
  label: string;
  count: number;
  totalValue: number;
  weightedValue: number;
}

const STAGE_HEX: Record<string, string> = {
  IDENTIFIED: "#94a3b8",
  SCREENING: "#94a3b8",
  QUALIFIED: "#3b82f6",
  CAPTURE: "#8b5cf6",
  BID_NO_BID: "#f59e0b",
  PROPOSAL: "#14b8a6",
  SUBMITTED: "#3b82f6",
  EVALUATION: "#8b5cf6",
  AWARDED: "#22c55e",
  LOST: "#ef4444",
  CANCELED: "#94a3b8",
  ARCHIVED: "#cbd5e1",
};

export function PipelineChart({ data }: { data: PipelineDatum[] }) {
  const active = data.filter((d) => d.count > 0);
  if (active.length === 0) {
    return <p className="px-4 py-10 text-center text-sm text-slate-400">No pipeline data yet.</p>;
  }
  const totalWeighted = active.reduce((s, d) => s + d.weightedValue, 0);

  return (
    <div className="p-2">
      {/* Screen-reader summary of the chart. */}
      <p className="sr-only">
        Weighted pipeline value by stage. Total weighted value {formatCurrency(totalWeighted)} across{" "}
        {active.length} active stages.
        {active.map((d) => ` ${STAGE_STYLES[d.stage]?.label ?? d.stage}: ${formatCurrency(d.weightedValue)}.`)}
      </p>
      <ResponsiveContainer width="100%" height={Math.max(180, active.length * 34)}>
        <BarChart data={active} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
          <CartesianGrid horizontal={false} stroke="#eef2f7" />
          <XAxis
            type="number"
            tickFormatter={(v) => formatCurrency(v)}
            tick={{ fontSize: 11, fill: "#64748b" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={92}
            tick={{ fontSize: 11, fill: "#475569" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: "#f1f5f9" }}
            formatter={(value: number, name) => [formatCurrency(value), name === "weightedValue" ? "Weighted" : "Total"]}
            contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
          />
          <Bar dataKey="weightedValue" name="Weighted" radius={[0, 4, 4, 0]}>
            {active.map((d) => (
              <Cell key={d.stage} fill={STAGE_HEX[d.stage] ?? "#3b82f6"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
