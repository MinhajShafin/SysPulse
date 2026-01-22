# SysPulse Frontend

A real-time system monitoring dashboard built with **Next.js 14**, featuring a cyberpunk/terminal aesthetic with live data visualization.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Components](#components)
  - [Dashboard (page.tsx)](#dashboard-pagetsx)
  - [LiveChart](#livechart)
  - [StatCard](#statcard)
- [Styling](#styling)
  - [Color Palette](#color-palette)
  - [CSS Classes](#custom-css-classes)
- [Socket.io Integration](#socketio-integration)
- [Database Models](#database-models)
- [Configuration](#configuration)
- [Customization](#customization)

---

## Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  ███████╗██╗   ██╗███████╗██████╗ ██╗   ██╗██╗     ███████╗    │
│  ██╔════╝╚██╗ ██╔╝██╔════╝██╔══██╗██║   ██║██║     ██╔════╝    │
│  ███████╗ ╚████╔╝ ███████╗██████╔╝██║   ██║██║     ███████╗    │
│  ╚════██║  ╚██╔╝  ╚════██║██╔═══╝ ██║   ██║██║     ╚════██║    │
│  ███████║   ██║   ███████║██║     ╚██████╔╝███████╗███████║    │
│  ╚══════╝   ╚═╝   ╚══════╝╚═╝      ╚═════╝ ╚══════╝╚══════╝    │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐                      │
│  │   CPU USAGE     │  │   RAM USAGE     │                      │
│  │                 │  │                 │                      │
│  │    45.2%        │  │    62.1%        │                      │
│  │   ▓▓▓▓▓░░░░░    │  │   ▓▓▓▓▓▓░░░░    │                      │
│  │   NOMINAL       │  │   WARNING       │                      │
│  └─────────────────┘  └─────────────────┘                      │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Real-Time Telemetry                          CPU  RAM  │   │
│  │  100%┤                                                  │   │
│  │   80%┤          ╭─╮                                     │   │
│  │   60%┤    ╭────╯  ╰──╮    ╭──                          │   │
│  │   40%┤───╯           ╰────╯                             │   │
│  │   20%┤                                                  │   │
│  │    0%┼────────────────────────────────────────────────  │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Features

- 🎨 **Cyberpunk UI** - Dark theme with neon accents and scanline effects
- 📊 **Real-time Charts** - Live updating line charts with Recharts
- 🔌 **WebSocket** - Instant updates via Socket.io
- 📱 **Responsive** - Works on desktop and mobile
- 🎯 **Threshold Indicators** - Visual warnings at 50%/85% usage
- ✨ **Glow Effects** - SVG filters for neon glow aesthetics

---

## Tech Stack

| Technology           | Purpose                         |
| -------------------- | ------------------------------- |
| **Next.js 14**       | React framework with App Router |
| **React 18**         | UI library                      |
| **TypeScript**       | Type safety                     |
| **Tailwind CSS**     | Utility-first styling           |
| **Recharts**         | Chart library                   |
| **Socket.io Client** | Real-time communication         |
| **Mongoose**         | MongoDB ODM                     |

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Running middleware server (see Engine docs)

### Installation

```bash
cd Frontend
npm install
```

### Development

```bash
npm run dev
```

Opens at **http://localhost:3001**

### Production Build

```bash
npm run build
npm start
```

---

## Project Structure

```
Frontend/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Dashboard page
│   │   └── globals.css         # Global styles
│   │
│   ├── components/             # React components
│   │   ├── index.ts            # Barrel exports
│   │   ├── LiveChart.tsx       # Real-time chart
│   │   └── StatCard.tsx        # Metric display card
│   │
│   ├── lib/                    # Utilities
│   │   └── mongodb.ts          # Database connection
│   │
│   └── models/                 # Mongoose schemas
│       └── Alert.ts            # Alert model
│
├── public/                     # Static assets
├── tailwind.config.ts          # Tailwind configuration
├── tsconfig.json               # TypeScript config
└── package.json
```

---

## Components

### Dashboard (page.tsx)

The main dashboard page that orchestrates all components.

**Features:**

- Socket.io connection management
- Data state management (60-point buffer)
- Connection status display
- Error handling

**State:**

```typescript
interface TelemetryData {
  cpu: number;
  ram: number;
  timestamp?: string;
  uptime?: number;
}

interface DataPoint {
  time: string; // Formatted time "HH:MM:SS"
  cpu: number;
  ram: number;
  timestamp: number; // Unix timestamp
}
```

**Socket Events Handled:**

- `connect` - Connection established
- `disconnect` - Connection lost
- `connect_error` - Connection failed
- `status-update` - New telemetry data

---

### LiveChart

Real-time line chart component using Recharts.

**Props:**

```typescript
interface LiveChartProps {
  data: DataPoint[]; // Array of data points
  maxDataPoints?: number; // Max points to display (default: 60)
}
```

**Features:**

- Dual line chart (CPU green, RAM amber)
- Gradient fill under lines
- SVG glow filters for neon effect
- Custom tooltip
- Reference line at 85% threshold
- Responsive container
- Empty state handling

**Usage:**

```tsx
<LiveChart data={chartData} maxDataPoints={60} />
```

---

### StatCard

Large metric display card with progress bar and status.

**Props:**

```typescript
interface StatCardProps {
  label: string; // Card title
  value: number; // Current value (0-100)
  unit?: string; // Unit suffix (default: "%")
  icon?: React.ReactNode; // Optional icon
  thresholdWarning?: number; // Warning threshold (default: 50)
  thresholdCritical?: number; // Critical threshold (default: 85)
}
```

**Features:**

- Dynamic color based on thresholds:
  - Green (< warning): NOMINAL
  - Amber (warning-critical): WARNING
  - Red (>= critical): CRITICAL
- Animated glow border
- Progress bar with threshold markers
- Pulse animation on status dot

**Usage:**

```tsx
<StatCard
  label="CPU Usage"
  value={45.2}
  icon={<CpuIcon />}
  thresholdWarning={50}
  thresholdCritical={85}
/>
```

---

## Styling

### Color Palette

```css
:root {
  --cyber-green: #00ff9f; /* Primary accent */
  --cyber-amber: #ffb800; /* Warning */
  --cyber-red: #ff0055; /* Critical */
  --cyber-blue: #00d4ff; /* Info */
  --bg-dark: #09090b; /* Background */
  --bg-card: #18181b; /* Card background */
}
```

### Tailwind Extensions

```typescript
// tailwind.config.ts
colors: {
  cyber: {
    green: "#00ff9f",
    amber: "#ffb800",
    red: "#ff0055",
    blue: "#00d4ff",
  },
}
```

### Custom CSS Classes

| Class                | Effect                      |
| -------------------- | --------------------------- |
| `.glow-green`        | Green text shadow glow      |
| `.glow-amber`        | Amber text shadow glow      |
| `.glow-red`          | Red text shadow glow        |
| `.border-glow-green` | Green box shadow border     |
| `.border-glow-amber` | Amber box shadow border     |
| `.border-glow-red`   | Red box shadow border       |
| `.scanline`          | CRT scanline overlay effect |
| `.cursor-blink`      | Terminal cursor animation   |

### Font

Uses **JetBrains Mono** for the terminal aesthetic:

```css
font-family: "JetBrains Mono", "Fira Code", "Monaco", "Consolas", monospace;
```

---

## Socket.io Integration

### Connection Setup

```typescript
const socket = io(SOCKET_URL, {
  transports: ["websocket", "polling"],
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  timeout: 10000,
});
```

### Handling Events

```typescript
// New telemetry data
socket.on("status-update", (data: TelemetryData) => {
  setCurrentData(data);
  setChartData((prev) => [...prev, newPoint].slice(-MAX_DATA_POINTS));
});

// Alerts
socket.on("alert", (alert) => {
  console.warn("Alert:", alert);
  // Handle alert display
});
```

---

## Database Models

### Alert Schema

Located in `src/models/Alert.ts`:

```typescript
interface IAlert {
  type: "CPU" | "RAM" | "DISK" | "NETWORK";
  value: number;
  threshold: number;
  message: string;
  severity: "warning" | "critical";
  acknowledged: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

**Static Methods:**

- `getActiveAlerts()` - Get unacknowledged alerts
- `getByType(type)` - Get alerts by type

**Instance Methods:**

- `acknowledge()` - Mark alert as acknowledged

---

## Configuration

### Environment Variables

Create `.env.local`:

```env
# Socket.io server URL
NEXT_PUBLIC_SOCKET_URL=http://localhost:3000

# MongoDB (for API routes if needed)
MONGODB_URI=mongodb://localhost:27017/syspulse
```

### Constants

In `page.tsx`:

```typescript
const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000";
const MAX_DATA_POINTS = 60; // 1 minute of data at 1s intervals
```

---

## Customization

### Changing Colors

Edit `tailwind.config.ts`:

```typescript
colors: {
  cyber: {
    green: "#YOUR_COLOR",  // Primary
    amber: "#YOUR_COLOR",  // Warning
    red: "#YOUR_COLOR",    // Critical
  },
}
```

And update `globals.css`:

```css
:root {
  --cyber-green: #YOUR_COLOR;
  --cyber-amber: #YOUR_COLOR;
  --cyber-red: #YOUR_COLOR;
}
```

### Changing Thresholds

In `page.tsx`, modify StatCard props:

```tsx
<StatCard
  thresholdWarning={60} // Warning at 60%
  thresholdCritical={90} // Critical at 90%
/>
```

### Changing Data Buffer Size

```typescript
const MAX_DATA_POINTS = 120; // 2 minutes of data
```

### Adding New Metrics

1. Update the data interfaces
2. Add new StatCard component
3. Add new line to LiveChart
4. Update Socket.io handler

---

## Scripts

| Command         | Description              |
| --------------- | ------------------------ |
| `npm run dev`   | Start development server |
| `npm run build` | Build for production     |
| `npm start`     | Start production server  |
| `npm run lint`  | Run ESLint               |

---

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

---

## Performance Tips

1. **Data Buffer** - Keep `MAX_DATA_POINTS` reasonable (60-120)
2. **Animation** - Charts use `isAnimationActive={false}` for performance
3. **Reconnection** - Socket.io auto-reconnects with backoff
4. **Memoization** - Chart data uses `useMemo` for optimization
