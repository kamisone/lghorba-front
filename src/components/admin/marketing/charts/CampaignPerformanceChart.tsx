"use client";

import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";

export interface CampaignPerfRow {
  id: string;
  title: string;
  openRate: number;
  clickRate: number;
}

export default function CampaignPerformanceChart({ data }: { data: CampaignPerfRow[] }) {
  const chartData = data.map(d => ({
    name: d.title.length > 18 ? `${d.title.slice(0, 18)}…` : d.title,
    openRate: Math.round(d.openRate * 1000) / 10,
    clickRate: Math.round(d.clickRate * 1000) / 10,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ bottom: 24 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} />
        <YAxis tick={{ fontSize: 12 }} unit="%" />
        <Tooltip formatter={(v: number) => `${v}%`} />
        <Legend />
        <Bar dataKey="openRate" name="Open rate" fill="#1d4ed8" radius={[4, 4, 0, 0]} />
        <Bar dataKey="clickRate" name="Click rate" fill="#059669" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
