
"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { Button } from "@/components/ui/button";
import type { UniswapPool } from "@/app/lib/types";

type PoolChartProps = {
  pool: UniswapPool;
};

function formatCurrency(value: number) {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
}

export function PoolChart({ pool }: PoolChartProps) {
  const [timeRange, setTimeRange] = useState("1D");
  
  const chartConfig = {
    volume: {
      label: "Volume",
      color: "hsl(var(--primary))",
    },
  };

  return (
    <div className="flex flex-col gap-4">
        <div>
            <div className="text-3xl font-bold">${(pool.volume1d / 1000).toFixed(1)}K</div>
            <div className="text-sm text-muted-foreground">Past day</div>
        </div>
        <div className="h-80 w-full">
            <ChartContainer config={chartConfig} className="h-full w-full">
                <ResponsiveContainer>
                    <BarChart data={pool.historicalData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" />
                        <XAxis
                            dataKey="time"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                        />
                        <YAxis
                            tickFormatter={(value) => formatCurrency(value as number)}
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            orientation="right"
                        />
                        <Tooltip
                            cursor={true}
                            content={<ChartTooltipContent 
                                formatter={(value) => formatCurrency(value as number)}
                                indicator="dot"
                                labelClassName="font-semibold"
                            />}
                        />
                        <Bar dataKey="volume" fill="var(--color-volume)" radius={2} />
                    </BarChart>
                </ResponsiveContainer>
            </ChartContainer>
        </div>
         <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
                {["1H", "1D", "1W", "1M", "1Y"].map((range) => (
                <Button
                    key={range}
                    variant={timeRange === range ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setTimeRange(range)}
                >
                    {range}
                </Button>
                ))}
            </div>
            <Button variant="secondary" size="sm">Volume</Button>
        </div>
    </div>
  );
}
