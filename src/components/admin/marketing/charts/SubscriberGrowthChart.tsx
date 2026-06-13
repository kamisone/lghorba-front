"use client";

import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";

export interface GrowthPoint {
  date: string;
  newSubscribers: number;
  totalSubscribers: number;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function SubscriberGrowthChart({ data }: { data: GrowthPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
        <XAxis dataKey="date" tick={{ fontSize: 12 }} tickFormatter={formatDate} />
        <YAxis yAxisId="left" tick={{ fontSize: 12 }} allowDecimals={false} />
        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} allowDecimals={false} />
        <Tooltip labelFormatter={formatDate} />
        <Legend />
        <Line yAxisId="left" type="monotone" dataKey="totalSubscribers" name="Total subscribers" stroke="#1d4ed8" strokeWidth={2} dot={false} />
        <Line yAxisId="right" type="monotone" dataKey="newSubscribers" name="New subscribers" stroke="#059669" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
