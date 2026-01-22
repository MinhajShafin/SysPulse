# SysPulse Engine

The backend infrastructure for SysPulse, consisting of a **C++ telemetry agent** and a **Node.js middleware server**.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [C++ Agent](#c-agent)
  - [Features](#agent-features)
  - [Building](#building-the-agent)
  - [Configuration](#agent-configuration)
  - [How It Works](#how-the-agent-works)
- [Middleware Server](#middleware-server)
  - [Features](#middleware-features)
  - [Installation](#installation)
  - [Configuration](#middleware-configuration)
  - [API Reference](#api-reference)
  - [WebSocket Events](#websocket-events)
  - [Alert System](#alert-system)
- [Database Schema](#database-schema)

---

## Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         ENGINE                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────────┐          ┌──────────────────────────────┐   │
│   │              │  HTTP    │                              │   │
│   │  C++ Agent   │ ──────►  │     Middleware Server        │   │
│   │              │  POST    │                              │   │
│   │  • CPU %     │          │  • Express REST API          │   │
│   │  • RAM %     │          │  • Socket.io WebSocket       │   │
│   │  • 1s loop   │          │  • MongoDB/Mongoose          │   │
│   │              │          │  • Alert Generation          │   │
│   └──────────────┘          └──────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## C++ Agent

### Agent Features

- 📊 Reads CPU usage from `/proc/stat`
- 💾 Reads RAM usage from `/proc/meminfo`
- 🔄 Sends telemetry every 1 second
- 🌐 Uses libcurl for HTTP requests
- 📦 JSON serialization with nlohmann/json

### Building the Agent

**Prerequisites:**

- CMake 3.10+
- C++17 compatible compiler
- libcurl development headers

**Ubuntu/Debian:**

```bash
sudo apt install cmake build-essential libcurl4-openssl-dev
```

**Build:**

```bash
cd agent
mkdir -p build && cd build
cmake ..
make
```

**Run:**

```bash
./syspulse_agent
```

### Agent Configuration

Configuration is done via constants in `main.cpp`:

```cpp
const std::string SERVER_URL = "http://localhost:3000/api/telemetry";
const int UPDATE_INTERVAL_MS = 1000;  // 1 second
```

### How the Agent Works

1. **CPU Calculation:**

   ```
   Reads /proc/stat for CPU time values
   CPU% = (total_time - idle_time) / total_time * 100
   ```

2. **RAM Calculation:**

   ```
   Reads /proc/meminfo for MemTotal and MemAvailable
   RAM% = (MemTotal - MemAvailable) / MemTotal * 100
   ```

3. **Data Transmission:**
   ```json
   POST /api/telemetry
   {
     "cpu": 45.23,
     "ram": 62.18
   }
   ```

### Agent Code Structure

```
agent/
├── CMakeLists.txt      # CMake build configuration
├── main.cpp            # Main application source
├── include/
│   └── json.hpp        # nlohmann/json header-only library
└── build/
    └── syspulse_agent  # Compiled binary
```

---

## Middleware Server

### Middleware Features

- 🚀 Express.js REST API
- 🔌 Socket.io real-time broadcasting
- 🗄️ MongoDB integration with Mongoose
- 🚨 Automatic alert generation (CPU > 85%)
- 📊 Telemetry validation and processing
- 🔒 CORS support for cross-origin requests

### Installation

```bash
cd middleware
npm install
```

### Running

```bash
# Production
npm start

# Development (with auto-reload)
npm run dev
```

### Middleware Configuration

**Environment Variables:**

| Variable      | Default                              | Description               |
| ------------- | ------------------------------------ | ------------------------- |
| `PORT`        | `3000`                               | Server port               |
| `CORS_ORIGIN` | `*`                                  | Allowed CORS origins      |
| `MONGODB_URI` | `mongodb://localhost:27017/syspulse` | MongoDB connection string |

**Example `.env`:**

```env
PORT=3000
CORS_ORIGIN=http://localhost:3001
MONGODB_URI=mongodb://localhost:27017/syspulse
```

### API Reference

#### Health Check

```http
GET /api/health
```

**Response:**

```json
{
  "status": "healthy",
  "uptime": 3600,
  "connectedClients": 2,
  "lastUpdate": "2026-01-22T10:30:00.000Z"
}
```

#### Get Latest Telemetry

```http
GET /api/telemetry
```

**Response:**

```json
{
  "cpu": 45.23,
  "ram": 62.18,
  "timestamp": "2026-01-22T10:30:00.000Z",
  "uptime": 3600
}
```

#### Submit Telemetry (Agent → Server)

```http
POST /api/telemetry
Content-Type: application/json

{
  "cpu": 45.23,
  "ram": 62.18
}
```

**Response:**

```json
{
  "success": true,
  "received": {
    "cpu": 45.23,
    "ram": 62.18
  }
}
```

**Validation Rules:**

- `cpu` and `ram` must be numbers
- Values must be between 0 and 100

#### Server Statistics

```http
GET /api/stats
```

**Response:**

```json
{
  "server": {
    "uptime": 3600,
    "startTime": "2026-01-22T09:30:00.000Z"
  },
  "connections": {
    "websocket": 2
  },
  "latestTelemetry": { ... }
}
```

### WebSocket Events

Connect via Socket.io:

```javascript
import { io } from "socket.io-client";
const socket = io("http://localhost:3000");
```

#### Server → Client Events

| Event           | Payload                                         | Description         |
| --------------- | ----------------------------------------------- | ------------------- |
| `welcome`       | `{ message, clientId, serverUptime }`           | Sent on connection  |
| `status-update` | `{ cpu, ram, timestamp, uptime }`               | Telemetry broadcast |
| `alert`         | `{ type, value, severity, message, timestamp }` | CPU threshold alert |

#### Client → Server Events

| Event            | Payload  | Description              |
| ---------------- | -------- | ------------------------ |
| `request-status` | -        | Request latest telemetry |
| `ping`           | callback | Latency measurement      |

### Alert System

Alerts are automatically generated when CPU exceeds the threshold:

**Trigger Conditions:**

- CPU > 85% → `warning` severity
- CPU > 95% → `critical` severity

**Cooldown:** 60 seconds between alerts (prevents spam)

**Alert Broadcast:**

```json
{
  "type": "CPU",
  "value": 92.5,
  "severity": "critical",
  "message": "CPU usage exceeded 85%: currently at 92.50%",
  "timestamp": "2026-01-22T10:30:00.000Z"
}
```

---

## Database Schema

### Alert Model

```javascript
{
  type: {
    type: String,
    enum: ["CPU", "RAM", "DISK", "NETWORK"],
    required: true
  },
  value: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  threshold: {
    type: Number,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  severity: {
    type: String,
    enum: ["warning", "critical"],
    default: "warning"
  },
  acknowledged: {
    type: Boolean,
    default: false
  },
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**

- `type` - For filtering by alert type
- `severity, acknowledged` - For finding active alerts
- `createdAt` (TTL) - Auto-delete acknowledged alerts after 30 days

---

## Troubleshooting

### Agent Issues

**"Connection refused"**

- Ensure middleware is running on port 3000
- Check firewall settings

**"Cannot read /proc/stat"**

- Agent requires Linux (uses procfs)
- Run with appropriate permissions

### Middleware Issues

**"MongoDB connection failed"**

- Ensure MongoDB is running: `sudo systemctl start mongod`
- Check `MONGODB_URI` is correct

**"CORS error"**

- Set `CORS_ORIGIN` to your frontend URL
- For development: `CORS_ORIGIN=*`

---

## File Structure

```
Engine/
├── README.md           # This file
├── agent/
│   ├── CMakeLists.txt  # CMake configuration
│   ├── main.cpp        # Agent source code
│   ├── include/
│   │   └── json.hpp    # JSON library
│   └── build/
│       └── syspulse_agent
└── middleware/
    ├── package.json    # Node.js dependencies
    └── server.js       # Express + Socket.io server
```
