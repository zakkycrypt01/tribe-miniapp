"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";

type PerformanceChartProps = {
  data: { date: string; apy: number }[];
};

export function PerformanceChart({ data }: PerformanceChartProps) {
  const chartConfig = {
    apy: {
      label: "APY",
      color: "hsl(var(--primary))",
    },
  };

  return (
    <div className="h-64 w-full">
        <ChartContainer config={chartConfig} className="h-full w-full">
            <ResponsiveContainer>
                <BarChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis
                    tickFormatter={(value) => `${value}%`}
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    />
                    <Tooltip
                        cursor={false}
                        content={<ChartTooltipContent 
                            formatter={(value) => `${Number(value).toFixed(2)}%`}
                            indicator="dot"
                        />}
                    />
                    <Bar dataKey="apy" fill="var(--color-apy)" radius={4} />
                </BarChart>
            </ResponsiveContainer>
        </ChartContainer>
    </div>
  );
}
