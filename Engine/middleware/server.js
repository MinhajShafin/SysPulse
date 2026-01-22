/**
 * SysPulse Middleware Server
 *
 * Express server with Socket.io that receives telemetry data
 * from the C++ agent and broadcasts it to web clients.
 */

const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const mongoose = require("mongoose");

// Configuration
const PORT = process.env.PORT || 3000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/syspulse";
const CPU_ALERT_THRESHOLD = 85;

// ======================
// MongoDB Connection
// ======================

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("[MongoDB] ✅ Connected successfully");
  })
  .catch((err) => {
    console.error("[MongoDB] ❌ Connection error:", err.message);
  });

// Alert Schema
const AlertSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["CPU", "RAM", "DISK", "NETWORK"],
      required: true,
      index: true,
    },
    value: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    threshold: {
      type: Number,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    severity: {
      type: String,
      enum: ["warning", "critical"],
      default: "warning",
    },
    acknowledged: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

const Alert = mongoose.model("Alert", AlertSchema);

// Track last alert time to prevent spam (cooldown: 60 seconds)
let lastCpuAlertTime = 0;
const ALERT_COOLDOWN_MS = 60000;

// Initialize Express app
const app = express();
const httpServer = createServer(app);

// Initialize Socket.io with CORS support
const io = new Server(httpServer, {
  cors: {
    origin: CORS_ORIGIN,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
// Optional: Enable request logging
// app.use((req, res, next) => {
//   const timestamp = new Date().toISOString();
//   console.log(`[${timestamp}] ${req.method} ${req.path}`);
//   next();
// });

// Store latest telemetry data
let latestTelemetry = {
  cpu: 0,
  ram: 0,
  timestamp: null,
  uptime: 0,
};

// Track connected clients
let connectedClients = 0;

// Server start time for uptime calculation
const serverStartTime = Date.now();

// ======================
// REST API Routes
// ======================

/**
 * Health check endpoint
 */
app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    uptime: Math.floor((Date.now() - serverStartTime) / 1000),
    connectedClients,
    lastUpdate: latestTelemetry.timestamp,
  });
});

/**
 * Get latest telemetry data
 */
app.get("/api/telemetry", (req, res) => {
  res.json(latestTelemetry);
});

/**
 * Receive telemetry data from C++ agent
 * POST /api/telemetry
 * Body: { "cpu": number, "ram": number }
 */
app.post("/api/telemetry", (req, res) => {
  try {
    const { cpu, ram } = req.body;

    // Validate incoming data
    if (typeof cpu !== "number" || typeof ram !== "number") {
      return res.status(400).json({
        error: "Invalid payload",
        message: "cpu and ram must be numbers",
      });
    }

    if (cpu < 0 || cpu > 100 || ram < 0 || ram > 100) {
      return res.status(400).json({
        error: "Invalid values",
        message: "cpu and ram must be between 0 and 100",
      });
    }

    // Update latest telemetry
    latestTelemetry = {
      cpu: parseFloat(cpu.toFixed(2)),
      ram: parseFloat(ram.toFixed(2)),
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - serverStartTime) / 1000),
    };

    // Broadcast to all connected WebSocket clients
    io.emit("status-update", latestTelemetry);

    // Check CPU threshold and create alert if needed
    if (cpu > CPU_ALERT_THRESHOLD) {
      const now = Date.now();
      if (now - lastCpuAlertTime > ALERT_COOLDOWN_MS) {
        lastCpuAlertTime = now;
        const severity = cpu > 95 ? "critical" : "warning";

        const alert = new Alert({
          type: "CPU",
          value: cpu,
          threshold: CPU_ALERT_THRESHOLD,
          message: `CPU usage exceeded ${CPU_ALERT_THRESHOLD}%: currently at ${cpu.toFixed(2)}%`,
          severity,
        });

        alert
          .save()
          .then(() => {
            console.log(
              `\x1b[31m[ALERT] ⚠️  CPU Alert saved: ${cpu.toFixed(2)}% (${severity})\x1b[0m`,
            );
            // Broadcast alert to connected clients
            io.emit("alert", {
              type: "CPU",
              value: cpu,
              severity,
              message: alert.message,
              timestamp: new Date().toISOString(),
            });
          })
          .catch((err) => {
            console.error("[Alert] Failed to save alert:", err.message);
          });
      }
    }

    // Log telemetry (with color coding)
    const cpuColor = cpu > 80 ? "\x1b[31m" : cpu > 50 ? "\x1b[33m" : "\x1b[32m";
    const ramColor = ram > 80 ? "\x1b[31m" : ram > 50 ? "\x1b[33m" : "\x1b[32m";
    const reset = "\x1b[0m";

    console.log(
      `[Telemetry] CPU: ${cpuColor}${cpu.toFixed(2)}%${reset} | ` +
        `RAM: ${ramColor}${ram.toFixed(2)}%${reset} | ` +
        `Clients: ${connectedClients}`,
    );

    res.status(200).json({
      success: true,
      received: { cpu, ram },
    });
  } catch (error) {
    console.error("[Error] Failed to process telemetry:", error.message);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
});

/**
 * Get server statistics
 */
app.get("/api/stats", (req, res) => {
  res.json({
    server: {
      uptime: Math.floor((Date.now() - serverStartTime) / 1000),
      startTime: new Date(serverStartTime).toISOString(),
    },
    connections: {
      websocket: connectedClients,
    },
    latestTelemetry,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: "Not Found",
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("[Error]", err.stack);
  res.status(500).json({
    error: "Internal Server Error",
    message: err.message,
  });
});

// ======================
// WebSocket Handlers
// ======================

io.on("connection", (socket) => {
  connectedClients++;

  console.log(
    `[Socket.io] Client connected: ${socket.id} (Total: ${connectedClients})`,
  );

  // Send current telemetry to newly connected client
  socket.emit("status-update", latestTelemetry);

  // Send welcome message
  socket.emit("welcome", {
    message: "Connected to SysPulse Server",
    clientId: socket.id,
    serverUptime: Math.floor((Date.now() - serverStartTime) / 1000),
  });

  // Handle client requesting latest data
  socket.on("request-status", () => {
    socket.emit("status-update", latestTelemetry);
  });

  // Handle ping for latency measurement
  socket.on("ping", (callback) => {
    if (typeof callback === "function") {
      callback();
    }
  });

  // Handle disconnection
  socket.on("disconnect", (reason) => {
    connectedClients--;
    console.log(
      `[Socket.io] Client disconnected: ${socket.id} (Reason: ${reason}, Total: ${connectedClients})`,
    );
  });

  // Handle errors
  socket.on("error", (error) => {
    console.error(`[Socket.io] Error from ${socket.id}:`, error.message);
  });
});

// ======================
// Server Startup
// ======================

httpServer.listen(PORT, () => {
  console.log("");
  console.log("========================================");
  console.log("    SysPulse Middleware Server v1.0.0");
  console.log("========================================");
  console.log(`    HTTP Server:  http://localhost:${PORT}`);
  console.log(`    WebSocket:    ws://localhost:${PORT}`);
  console.log("----------------------------------------");
  console.log("    API Endpoints:");
  console.log(`    GET  /api/health     - Health check`);
  console.log(`    GET  /api/telemetry  - Get latest data`);
  console.log(`    POST /api/telemetry  - Receive data`);
  console.log(`    GET  /api/stats      - Server stats`);
  console.log("----------------------------------------");
  console.log("    WebSocket Events:");
  console.log("    -> status-update     - Telemetry broadcast");
  console.log("    -> welcome           - Connection greeting");
  console.log("    <- request-status    - Request latest data");
  console.log("========================================");
  console.log("");
  console.log("[Server] Waiting for C++ agent connection...");
  console.log("");
});

// Graceful shutdown
const shutdown = (signal) => {
  console.log(`\n[Server] Received ${signal}, shutting down gracefully...`);

  // Close all WebSocket connections
  io.close(() => {
    console.log("[Server] WebSocket connections closed");
  });

  // Close HTTP server
  httpServer.close(() => {
    console.log("[Server] HTTP server closed");
    process.exit(0);
  });

  // Force exit after timeout
  setTimeout(() => {
    console.error("[Server] Forced shutdown after timeout");
    process.exit(1);
  }, 5000);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
