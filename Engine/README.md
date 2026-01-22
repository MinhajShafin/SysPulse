# SysPulse Engine

A real-time Linux system monitoring solution consisting of a C++ agent daemon and a Node.js middleware server.

## Architecture

```
┌─────────────────┐     HTTP POST      ┌─────────────────┐     WebSocket     ┌─────────────────┐
│   C++ Agent     │ ──────────────────▶│  Node.js Server │ ◀───────────────▶ │   Web Clients   │
│  (Linux Daemon) │  /api/telemetry    │  (Express +     │   status-update   │   (Browsers)    │
│                 │  {"cpu","ram"}     │   Socket.io)    │                   │                 │
└─────────────────┘                    └─────────────────┘                   └─────────────────┘
        │                                      │
        ▼                                      ▼
   /proc/stat                           Port 3000
   /proc/meminfo
```

## Components

### 1. C++ Agent (`/agent`)

A lightweight, dependency-free daemon that:

- Reads CPU usage from `/proc/stat` (calculates ticks delta)
- Reads RAM usage from `/proc/meminfo`
- Sends JSON telemetry via HTTP POST every 1 second
- Uses raw BSD sockets (no external HTTP library dependency)
- Zero system dependencies beyond standard C++ library

**Dependencies:**

- [nlohmann/json](https://github.com/nlohmann/json) - Header-only JSON library (included)

### 2. Node.js Middleware (`/middleware`)

An Express server that:

- Receives telemetry data via REST API
- Broadcasts updates to web clients via Socket.io
- Provides health check and statistics endpoints

## Quick Start

### 1. Start the Middleware Server

```bash
cd middleware
npm install
npm start
```

The server will start on `http://localhost:3000`

### 2. Build and Run the C++ Agent

```bash
cd agent
mkdir build && cd build
cmake ..
make -j$(nproc)
./syspulse_agent
```

Run the agent
/home/billy/X/SysPulse/Engine/agent/build/syspulse_agent

## API Reference

### REST Endpoints

| Method | Endpoint         | Description                  |
| ------ | ---------------- | ---------------------------- |
| `GET`  | `/api/health`    | Health check with uptime     |
| `GET`  | `/api/telemetry` | Get latest telemetry data    |
| `POST` | `/api/telemetry` | Receive telemetry from agent |
| `GET`  | `/api/stats`     | Server statistics            |

### WebSocket Events

| Event            | Direction       | Description                   |
| ---------------- | --------------- | ----------------------------- |
| `status-update`  | Server → Client | Real-time telemetry broadcast |
| `welcome`        | Server → Client | Connection acknowledgment     |
| `request-status` | Client → Server | Request latest data           |

### Telemetry Payload

```json
{
  "cpu": 12.5,
  "ram": 45.0,
  "timestamp": "2026-01-21T10:30:00.000Z",
  "uptime": 3600
}
```

## Configuration

### C++ Agent

Edit constants in `main.cpp`:

```cpp
const std::string serverHost = "127.0.0.1";  // Server IP address
const int serverPort = 3000;                   // Server port
const int intervalMs = 1000;                   // Update interval in milliseconds
```

### Node.js Server

Environment variables:

```bash
PORT=3000           # HTTP/WebSocket port
CORS_ORIGIN=*       # CORS allowed origins
```

## Design Notes

### Why No HTTP Libraries?

The agent uses raw BSD sockets instead of complex HTTP libraries to:

- **Minimize dependencies**: Only nlohmann/json is required
- **Reduce attack surface**: No external HTTP library vulnerabilities
- **Improve performance**: Direct socket communication with minimal overhead
- **Simplify deployment**: Small ~93KB binary, zero external dependencies at runtime

## Development

### Building in Debug Mode

```bash
cd agent/build
cmake -DCMAKE_BUILD_TYPE=Debug ..
make
```

### Running Server in Dev Mode (auto-reload)

```bash
cd middleware
npm run dev
```

## License

MIT
