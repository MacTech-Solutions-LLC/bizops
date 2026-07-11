"use client";

import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/lib/ui/format";

export function ForecastChart({ data }: { data: Array<{ month: string; weightedValue: number }> }) {
  if (data.length === 0)
    return <p className="px-4 py-8 text-center text-sm text-slate-400">No expected-award dates set.</p>;
  return (
    <>
      <p className="sr-only">
        Weighted forecast by expected-award month.
        {data.map((d) => ` ${d.month}: ${formatCurrency(d.weightedValue)}.`)}
      </p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ left: 8, right: 12, top: 8, bottom: 4 }}>
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={(v) => formatCurrency(v)} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} width={60} />
          <Tooltip formatter={(v: number) => [formatCurrency(v), "Weighted"]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
          <Bar dataKey="weightedValue" fill="#2563eb" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </>
  );
}

const WL_COLORS = { won: "#22c55e", lost: "#ef4444", noBid: "#94a3b8" };

export function WinLossChart({ won, lost, noBid }: { won: number; lost: number; noBid: number }) {
  const data = [
    { name: "Won", value: won, key: "won" },
    { name: "Lost", value: lost, key: "lost" },
    { name: "No-Bid", value: noBid, key: "noBid" },
  ].filter((d) => d.value > 0);
  if (data.length === 0)
    return <p className="px-4 py-8 text-center text-sm text-slate-400">No decided pursuits yet.</p>;
  return (
    <>
      <p className="sr-only">Win/loss: {won} won, {lost} lost, {noBid} no-bid.</p>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={2}>
            {data.map((d) => (
              <Cell key={d.key} fill={WL_COLORS[d.key as keyof typeof WL_COLORS]} />
            ))}
          </Pie>
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex justify-center gap-4 pb-3 text-xs text-slate-500">
        <span>● Won {won}</span>
        <span>● Lost {lost}</span>
        <span>● No-Bid {noBid}</span>
      </div>
    </>
  );
}
