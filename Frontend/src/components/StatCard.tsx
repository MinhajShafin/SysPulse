"use client";

import React from "react";

interface StatCardProps {
  label: string;
  value: number;
  unit?: string;
  icon?: React.ReactNode;
  thresholdWarning?: number;
  thresholdCritical?: number;
}

export default function StatCard({
  label,
  value,
  unit = "%",
  icon,
  thresholdWarning = 50,
  thresholdCritical = 85,
}: StatCardProps) {
  // Determine color based on thresholds
  const getColorClass = () => {
    if (value >= thresholdCritical) return "cyber-red";
    if (value >= thresholdWarning) return "cyber-amber";
    return "cyber-green";
  };

  const getGlowClass = () => {
    if (value >= thresholdCritical) return "glow-red border-glow-red";
    if (value >= thresholdWarning) return "glow-amber border-glow-amber";
    return "glow-green border-glow-green";
  };

  const getBorderColor = () => {
    if (value >= thresholdCritical) return "border-cyber-red";
    if (value >= thresholdWarning) return "border-cyber-amber";
    return "border-cyber-green";
  };

  const getTextColor = () => {
    if (value >= thresholdCritical) return "text-cyber-red";
    if (value >= thresholdWarning) return "text-cyber-amber";
    return "text-cyber-green";
  };

  // Progress bar width
  const progressWidth = Math.min(value, 100);

  return (
    <div
      className={`
        relative overflow-hidden
        bg-zinc-900/80 backdrop-blur-sm
        border ${getBorderColor()}
        rounded-lg p-6
        transition-all duration-300
        hover:scale-[1.02]
        ${getGlowClass()}
      `}
    >
      {/* Scanline overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div
          className="absolute inset-0"
          style={{
            background:
              "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,159,0.03) 2px, rgba(0,255,159,0.03) 4px)",
          }}
        />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {icon && <span className={`${getTextColor()} text-xl`}>{icon}</span>}
          <span className="text-zinc-400 text-sm uppercase tracking-wider font-medium">
            {label}
          </span>
        </div>
        <div
          className={`
            w-2 h-2 rounded-full ${getTextColor().replace("text-", "bg-")}
            animate-pulse
          `}
        />
      </div>

      {/* Value Display */}
      <div className="relative z-10">
        <div className={`text-6xl font-bold ${getTextColor()} tracking-tight`}>
          <span className={getGlowClass().split(" ")[0]}>
            {value.toFixed(1)}
          </span>
          <span className="text-3xl ml-1 text-zinc-500">{unit}</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-4 h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ease-out rounded-full ${
            value >= thresholdCritical
              ? "bg-cyber-red"
              : value >= thresholdWarning
                ? "bg-cyber-amber"
                : "bg-cyber-green"
          }`}
          style={{
            width: `${progressWidth}%`,
            boxShadow:
              value >= thresholdCritical
                ? "0 0 10px #ff0055"
                : value >= thresholdWarning
                  ? "0 0 10px #ffb800"
                  : "0 0 10px #00ff9f",
          }}
        />
      </div>

      {/* Threshold markers */}
      <div className="relative h-1 mt-1">
        <div
          className="absolute w-px h-2 bg-zinc-600"
          style={{ left: `${thresholdWarning}%` }}
        />
        <div
          className="absolute w-px h-2 bg-zinc-600"
          style={{ left: `${thresholdCritical}%` }}
        />
      </div>

      {/* Status Text */}
      <div className="mt-3 flex justify-between text-xs text-zinc-500">
        <span>
          Status:{" "}
          <span className={getTextColor()}>
            {value >= thresholdCritical
              ? "CRITICAL"
              : value >= thresholdWarning
                ? "WARNING"
                : "NOMINAL"}
          </span>
        </span>
        <span>
          Threshold: {thresholdWarning}/{thresholdCritical}
        </span>
      </div>
    </div>
  );
}
