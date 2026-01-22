# SysPulse

<div align="center">

![SysPulse](https://img.shields.io/badge/SysPulse-System%20Monitor-00ff9f?style=for-the-badge&labelColor=09090b)
![Version](https://img.shields.io/badge/version-1.0.0-ffb800?style=for-the-badge&labelColor=09090b)
![License](https://img.shields.io/badge/license-MIT-00d4ff?style=for-the-badge&labelColor=09090b)

**Real-time system monitoring with a cyberpunk aesthetic**

[Features](#features) • [Quick Start](#quick-start) • [Architecture](#architecture) • [Tech Stack](#tech-stack)

</div>

---

## Overview

SysPulse is a full-stack system monitoring application that collects CPU and RAM metrics from your machine and displays them in a sleek, cyberpunk-themed dashboard with real-time updates.

```
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│   ███████╗██╗   ██╗███████╗██████╗ ██╗   ██╗██╗     ███████╗███████╗ │
│   ██╔════╝╚██╗ ██╔╝██╔════╝██╔══██╗██║   ██║██║     ██╔════╝██╔════╝ │
│   ███████╗ ╚████╔╝ ███████╗██████╔╝██║   ██║██║     ███████╗█████╗   │
│   ╚════██║  ╚██╔╝  ╚════██║██╔═══╝ ██║   ██║██║     ╚════██║██╔══╝   │
│   ███████║   ██║   ███████║██║     ╚██████╔╝███████╗███████║███████╗ │
│   ╚══════╝   ╚═╝   ╚══════╝╚═╝      ╚═════╝ ╚══════╝╚══════╝╚══════╝ │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

## Features

- 🖥️ **Real-time Monitoring** - Live CPU and RAM usage tracking
- 📊 **Interactive Charts** - Dynamic line charts with Recharts
- 🚨 **Alert System** - Automatic alerts when CPU exceeds 85%
- 🌐 **WebSocket Updates** - Instant data streaming via Socket.io
- 🎨 **Cyberpunk UI** - Dark theme with neon green/amber accents
- 💾 **MongoDB Storage** - Persistent alert history

## Quick Start

### Prerequisites

- Node.js 18+
- MongoDB
- CMake & C++ compiler (for the agent)

### One-Command Start

```bash
./start.sh
```

This will start all services:

- **MongoDB** check/start
- **Middleware** on `http://localhost:3000`
- **C++ Agent** for telemetry collection
- **Frontend** on `http://localhost:3001`

### Manual Start

```bash
# Terminal 1: Start MongoDB
mongod

# Terminal 2: Start Middleware
cd Engine/middleware
npm install
npm start

# Terminal 3: Start C++ Agent
cd Engine/agent/build
./syspulse_agent

# Terminal 4: Start Frontend
cd Frontend
npm install
npm run dev
```

Then open **http://localhost:3001** in your browser.

## Architecture

```
┌──────────────┐     HTTP POST      ┌──────────────┐    WebSocket    ┌──────────────┐
│              │  ───────────────►  │              │  ────────────►  │              │
│  C++ Agent   │   /api/telemetry   │  Middleware  │  status-update  │   Frontend   │
│  (Collector) │                    │  (Express)   │                 │   (Next.js)  │
│              │                    │              │                 │              │
└──────────────┘                    └──────┬───────┘                 └──────────────┘
                                          │
                                          │ Mongoose
                                          ▼
                                   ┌──────────────┐
                                   │   MongoDB    │
                                   │   (Alerts)   │
                                   └──────────────┘
```

## Project Structure

```
SysPulse/
├── start.sh              # One-command startup script
├── Engine/
│   ├── agent/            # C++ telemetry collector
│   │   ├── main.cpp
│   │   ├── CMakeLists.txt
│   │   └── include/
│   └── middleware/       # Express + Socket.io server
│       ├── server.js
│       └── package.json
└── Frontend/             # Next.js dashboard
    ├── src/
    │   ├── app/          # App Router pages
    │   ├── components/   # React components
    │   ├── lib/          # Utilities
    │   └── models/       # Mongoose schemas
    └── package.json
```

## Tech Stack

| Layer          | Technology                                   |
| -------------- | -------------------------------------------- |
| **Agent**      | C++17, libcurl, nlohmann/json                |
| **Middleware** | Node.js, Express, Socket.io, Mongoose        |
| **Frontend**   | Next.js 14, React 18, Tailwind CSS, Recharts |
| **Database**   | MongoDB                                      |

## Configuration

### Environment Variables

**Middleware** (`Engine/middleware/`):

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/syspulse
```

**Frontend** (`Frontend/`):

```env
NEXT_PUBLIC_SOCKET_URL=http://localhost:3000
```

## API Endpoints

| Method | Endpoint         | Description                |
| ------ | ---------------- | -------------------------- |
| GET    | `/api/health`    | Health check               |
| GET    | `/api/telemetry` | Get latest metrics         |
| POST   | `/api/telemetry` | Receive metrics from agent |
| GET    | `/api/stats`     | Server statistics          |

## WebSocket Events

| Event           | Direction       | Description         |
| --------------- | --------------- | ------------------- |
| `status-update` | Server → Client | Telemetry broadcast |
| `alert`         | Server → Client | CPU threshold alert |
| `welcome`       | Server → Client | Connection greeting |

## License

MIT © 2026

---

<div align="center">

**[Engine Documentation](Engine/README.md)** • **[Frontend Documentation](Frontend/README.md)**

</div>
