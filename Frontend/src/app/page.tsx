"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";
import LiveChart from "@/components/LiveChart";
import StatCard from "@/components/StatCard";

interface TelemetryData {
  cpu: number;
  ram: number;
  timestamp?: string;
  uptime?: number;
}

interface DataPoint {
  time: string;
  cpu: number;
  ram: number;
  timestamp: number;
}

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000";
const MAX_DATA_POINTS = 60;

export default function Dashboard() {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [currentData, setCurrentData] = useState<TelemetryData>({
    cpu: 0,
    ram: 0,
  });
  const [chartData, setChartData] = useState<DataPoint[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // Format time for chart
  const formatTime = useCallback((date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }, []);

  // Handle incoming telemetry data
  const handleTelemetryUpdate = useCallback(
    (data: TelemetryData) => {
      const now = new Date();

      setCurrentData(data);
      setLastUpdate(now);

      setChartData((prev) => {
        const newPoint: DataPoint = {
          time: formatTime(now),
          cpu: data.cpu,
          ram: data.ram,
          timestamp: now.getTime(),
        };

        const updated = [...prev, newPoint];
        // Keep only the last MAX_DATA_POINTS
        return updated.slice(-MAX_DATA_POINTS);
      });
    },
    [formatTime],
  );

  // Socket connection management
  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[SysPulse] Connected to telemetry server");
      setIsConnected(true);
      setConnectionError(null);
    });

    socket.on("disconnect", (reason) => {
      console.log("[SysPulse] Disconnected:", reason);
      setIsConnected(false);
    });

    socket.on("connect_error", (error) => {
      console.error("[SysPulse] Connection error:", error.message);
      setConnectionError(error.message);
      setIsConnected(false);
    });

    socket.on("status-update", handleTelemetryUpdate);

    // Cleanup on unmount
    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("connect_error");
      socket.off("status-update");
      socket.close();
    };
  }, [handleTelemetryUpdate]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 scanline">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Logo */}
            <div className="relative">
              <div className="text-4xl font-bold tracking-tighter">
                <span className="text-cyber-green glow-green">SYS</span>
                <span className="text-zinc-400">PULSE</span>
              </div>
              <div className="text-xs text-zinc-600 tracking-widest mt-1">
                SYSTEM MONITOR v1.0.0
              </div>
            </div>
          </div>

          {/* Connection Status */}
          <div className="flex items-center gap-4">
            <div
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg border
                ${
                  isConnected
                    ? "border-cyber-green/50 bg-cyber-green/10 text-cyber-green"
                    : "border-cyber-red/50 bg-cyber-red/10 text-cyber-red"
                }
              `}
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  isConnected ? "bg-cyber-green animate-pulse" : "bg-cyber-red"
                }`}
              />
              <span className="text-sm font-mono uppercase">
                {isConnected ? "CONNECTED" : "DISCONNECTED"}
              </span>
            </div>

            {lastUpdate && (
              <div className="text-xs text-zinc-500">
                Last update:{" "}
                <span className="text-zinc-400">{formatTime(lastUpdate)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Error Banner */}
        {connectionError && (
          <div className="mt-4 p-3 bg-cyber-red/10 border border-cyber-red/50 rounded-lg text-cyber-red text-sm">
            <span className="font-bold">CONNECTION ERROR:</span>{" "}
            {connectionError}
            <span className="block mt-1 text-xs text-zinc-400">
              Ensure the middleware server is running on {SOCKET_URL}
            </span>
          </div>
        )}
      </header>

      {/* Stats Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <StatCard
          label="CPU Usage"
          value={currentData.cpu}
          icon={
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
              />
            </svg>
          }
          thresholdWarning={50}
          thresholdCritical={85}
        />
        <StatCard
          label="Memory Usage"
          value={currentData.ram}
          icon={
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          }
          thresholdWarning={60}
          thresholdCritical={90}
        />
      </section>

      {/* Live Chart */}
      <section className="mb-8">
        <LiveChart data={chartData} maxDataPoints={MAX_DATA_POINTS} />
      </section>

      {/* Footer */}
      <footer className="text-center text-zinc-600 text-xs">
        <div className="flex items-center justify-center gap-2">
          <span>◈</span>
          <span>SysPulse Monitoring System</span>
          <span>◈</span>
          <span>Socket: {SOCKET_URL}</span>
          <span>◈</span>
        </div>
      </footer>
    </div>
  );
}
