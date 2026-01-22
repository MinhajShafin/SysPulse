"use client";

import React, { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  ComposedChart,
  ReferenceLine,
} from "recharts";

interface DataPoint {
  time: string;
  cpu: number;
  ram: number;
  timestamp: number;
}

interface LiveChartProps {
  data: DataPoint[];
  maxDataPoints?: number;
}

// Custom tooltip component
const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string; color: string }>;
  label?: string;
}) => {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-zinc-900/95 border border-cyber-green/50 rounded-lg p-3 backdrop-blur-sm shadow-lg">
      <p className="text-cyber-green text-xs mb-2 font-mono">[{label}]</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-zinc-400 uppercase text-xs">
            {entry.dataKey}:
          </span>
          <span className="font-bold" style={{ color: entry.color }}>
            {entry.value.toFixed(1)}%
          </span>
        </div>
      ))}
    </div>
  );
};

export default function LiveChart({
  data,
  maxDataPoints = 60,
}: LiveChartProps) {
  // Format data for display
  const chartData = useMemo(() => {
    return data.slice(-maxDataPoints).map((point) => ({
      ...point,
      time: point.time,
    }));
  }, [data, maxDataPoints]);

  // Calculate dynamic Y-axis domain
  const yDomain = useMemo(() => {
    if (chartData.length === 0) return [0, 100];
    const allValues = chartData.flatMap((d) => [d.cpu, d.ram]);
    const max = Math.max(...allValues, 50);
    return [0, Math.min(Math.ceil(max / 10) * 10 + 10, 100)];
  }, [chartData]);

  return (
    <div className="relative bg-zinc-900/80 backdrop-blur-sm border border-cyber-green/30 rounded-lg p-4 border-glow-green">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-cyber-green animate-pulse" />
          <h3 className="text-cyber-green text-sm uppercase tracking-wider font-medium">
            Real-Time Telemetry
          </h3>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-3 h-0.5 bg-cyber-green rounded" />
            <span className="text-zinc-400">CPU</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-0.5 bg-cyber-amber rounded" />
            <span className="text-zinc-400">RAM</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-[300px] w-full">
        {chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-zinc-500">
            <div className="text-center">
              <div className="text-4xl mb-2">◌</div>
              <p className="text-sm">Awaiting telemetry data...</p>
              <p className="text-xs text-zinc-600 mt-1">
                Connecting to data stream
              </p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
            >
              <defs>
                {/* CPU Gradient */}
                <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00ff9f" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#00ff9f" stopOpacity={0} />
                </linearGradient>
                {/* RAM Gradient */}
                <linearGradient id="ramGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffb800" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#ffb800" stopOpacity={0} />
                </linearGradient>
                {/* Glow filters */}
                <filter id="glow-green" height="300%">
                  <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <filter id="glow-amber" height="300%">
                  <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#27272a"
                vertical={false}
              />

              <XAxis
                dataKey="time"
                stroke="#52525b"
                tick={{ fill: "#71717a", fontSize: 10 }}
                tickLine={{ stroke: "#52525b" }}
                axisLine={{ stroke: "#27272a" }}
                interval="preserveStartEnd"
                minTickGap={50}
              />

              <YAxis
                domain={yDomain}
                stroke="#52525b"
                tick={{ fill: "#71717a", fontSize: 10 }}
                tickLine={{ stroke: "#52525b" }}
                axisLine={{ stroke: "#27272a" }}
                tickFormatter={(value) => `${value}%`}
              />

              <Tooltip content={<CustomTooltip />} />

              {/* Warning threshold line */}
              <ReferenceLine
                y={85}
                stroke="#ff0055"
                strokeDasharray="5 5"
                strokeOpacity={0.5}
              />

              {/* CPU Area */}
              <Area
                type="monotone"
                dataKey="cpu"
                stroke="transparent"
                fill="url(#cpuGradient)"
                isAnimationActive={false}
              />

              {/* RAM Area */}
              <Area
                type="monotone"
                dataKey="ram"
                stroke="transparent"
                fill="url(#ramGradient)"
                isAnimationActive={false}
              />

              {/* CPU Line */}
              <Line
                type="monotone"
                dataKey="cpu"
                stroke="#00ff9f"
                strokeWidth={2}
                dot={false}
                activeDot={{
                  r: 4,
                  fill: "#00ff9f",
                  stroke: "#000",
                  strokeWidth: 2,
                }}
                isAnimationActive={false}
                filter="url(#glow-green)"
              />

              {/* RAM Line */}
              <Line
                type="monotone"
                dataKey="ram"
                stroke="#ffb800"
                strokeWidth={2}
                dot={false}
                activeDot={{
                  r: 4,
                  fill: "#ffb800",
                  stroke: "#000",
                  strokeWidth: 2,
                }}
                isAnimationActive={false}
                filter="url(#glow-amber)"
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Footer stats */}
      <div className="mt-4 flex justify-between text-xs text-zinc-500 border-t border-zinc-800 pt-3">
        <span>
          Data points:{" "}
          <span className="text-cyber-green">{chartData.length}</span>
        </span>
        <span>
          Update rate: <span className="text-cyber-green">1s</span>
        </span>
        <span>
          Buffer: <span className="text-cyber-green">{maxDataPoints}pts</span>
        </span>
      </div>

      {/* Scanline effect overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-10 rounded-lg overflow-hidden"
        style={{
          background:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,159,0.03) 2px, rgba(0,255,159,0.03) 4px)",
        }}
      />
    </div>
  );
}
