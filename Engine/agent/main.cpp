/**
 * SysPulse Agent - Linux System Monitor Daemon
 *
 * Reads CPU and RAM usage from /proc filesystem and sends
 * telemetry data to the middleware server via HTTP POST.
 *
 * Uses raw sockets instead of complex HTTP libraries to avoid SSL dependencies.
 */

#include <iostream>
#include <fstream>
#include <sstream>
#include <string>
#include <thread>
#include <chrono>
#include <csignal>
#include <atomic>
#include <iomanip>
#include <cstring>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <unistd.h>

// Header-only JSON library
#include "json.hpp"

using json = nlohmann::json;

// Global flag for graceful shutdown
std::atomic<bool> g_running(true);

// Signal handler for graceful shutdown
void signalHandler(int signum)
{
    std::cout << "\n[SysPulse] Received signal " << signum << ", shutting down..." << std::endl;
    g_running = false;
}

/**
 * CPU tick data structure
 */
struct CpuTicks
{
    unsigned long long user;
    unsigned long long nice;
    unsigned long long system;
    unsigned long long idle;
    unsigned long long iowait;
    unsigned long long irq;
    unsigned long long softirq;
    unsigned long long steal;

    unsigned long long getTotalIdle() const
    {
        return idle + iowait;
    }

    unsigned long long getTotalActive() const
    {
        return user + nice + system + irq + softirq + steal;
    }

    unsigned long long getTotal() const
    {
        return getTotalIdle() + getTotalActive();
    }
};

/**
 * Reads CPU ticks from /proc/stat
 * Returns true on success, false on failure
 */
bool readCpuTicks(CpuTicks &ticks)
{
    std::ifstream file("/proc/stat");
    if (!file.is_open())
    {
        std::cerr << "[SysPulse] Error: Cannot open /proc/stat" << std::endl;
        return false;
    }

    std::string line;
    if (!std::getline(file, line))
    {
        std::cerr << "[SysPulse] Error: Cannot read /proc/stat" << std::endl;
        return false;
    }

    // Parse the first line: cpu user nice system idle iowait irq softirq steal guest guest_nice
    std::istringstream iss(line);
    std::string cpu_label;

    iss >> cpu_label >> ticks.user >> ticks.nice >> ticks.system >> ticks.idle >> ticks.iowait >> ticks.irq >> ticks.softirq >> ticks.steal;

    if (cpu_label != "cpu")
    {
        std::cerr << "[SysPulse] Error: Unexpected format in /proc/stat" << std::endl;
        return false;
    }

    return true;
}

/**
 * Calculates CPU usage percentage between two tick readings
 */
double calculateCpuUsage(const CpuTicks &prev, const CpuTicks &curr)
{
    unsigned long long prevTotal = prev.getTotal();
    unsigned long long currTotal = curr.getTotal();
    unsigned long long prevIdle = prev.getTotalIdle();
    unsigned long long currIdle = curr.getTotalIdle();

    unsigned long long totalDiff = currTotal - prevTotal;
    unsigned long long idleDiff = currIdle - prevIdle;

    if (totalDiff == 0)
    {
        return 0.0;
    }

    double cpuUsage = (static_cast<double>(totalDiff - idleDiff) / static_cast<double>(totalDiff)) * 100.0;
    return cpuUsage;
}

/**
 * Reads RAM usage from /proc/meminfo
 * Returns RAM usage percentage, or -1.0 on error
 */
double readRamUsage()
{
    std::ifstream file("/proc/meminfo");
    if (!file.is_open())
    {
        std::cerr << "[SysPulse] Error: Cannot open /proc/meminfo" << std::endl;
        return -1.0;
    }

    unsigned long long memTotal = 0;
    unsigned long long memAvailable = 0;
    std::string line;

    while (std::getline(file, line))
    {
        std::istringstream iss(line);
        std::string key;
        unsigned long long value;
        std::string unit;

        iss >> key >> value >> unit;

        if (key == "MemTotal:")
        {
            memTotal = value;
        }
        else if (key == "MemAvailable:")
        {
            memAvailable = value;
        }

        // Stop once we have both values
        if (memTotal > 0 && memAvailable > 0)
        {
            break;
        }
    }

    if (memTotal == 0)
    {
        std::cerr << "[SysPulse] Error: Could not read MemTotal from /proc/meminfo" << std::endl;
        return -1.0;
    }

    // Calculate used memory percentage
    unsigned long long memUsed = memTotal - memAvailable;
    double ramUsage = (static_cast<double>(memUsed) / static_cast<double>(memTotal)) * 100.0;

    return ramUsage;
}

/**
 * Sends telemetry data to the middleware server via raw HTTP POST
 */
bool sendTelemetry(const std::string &host, int port, double cpu, double ram)
{
    // Create socket
    int sock = socket(AF_INET, SOCK_STREAM, 0);
    if (sock < 0)
    {
        std::cerr << "[SysPulse] Error: Cannot create socket" << std::endl;
        return false;
    }

    // Resolve host
    struct sockaddr_in serv_addr;
    serv_addr.sin_family = AF_INET;
    serv_addr.sin_port = htons(port);

    if (inet_pton(AF_INET, host.c_str(), &serv_addr.sin_addr) <= 0)
    {
        std::cerr << "[SysPulse] Error: Invalid address" << std::endl;
        close(sock);
        return false;
    }

    // Set socket timeout
    struct timeval tv;
    tv.tv_sec = 5;
    tv.tv_usec = 0;
    setsockopt(sock, SOL_SOCKET, SO_RCVTIMEO, (const char *)&tv, sizeof tv);

    // Connect to server
    if (connect(sock, (struct sockaddr *)&serv_addr, sizeof(serv_addr)) < 0)
    {
        std::cerr << "[SysPulse] Error: Connection failed" << std::endl;
        close(sock);
        return false;
    }

    // Build JSON payload
    json payload;
    payload["cpu"] = std::round(cpu * 100.0) / 100.0;
    payload["ram"] = std::round(ram * 100.0) / 100.0;
    std::string body = payload.dump();

    // Build HTTP POST request
    std::string request = "POST /api/telemetry HTTP/1.1\r\n";
    request += "Host: " + host + ":" + std::to_string(port) + "\r\n";
    request += "Content-Type: application/json\r\n";
    request += "Content-Length: " + std::to_string(body.length()) + "\r\n";
    request += "Connection: close\r\n";
    request += "\r\n";
    request += body;

    // Send request
    if (send(sock, request.c_str(), request.length(), 0) < 0)
    {
        std::cerr << "[SysPulse] Error: Failed to send request" << std::endl;
        close(sock);
        return false;
    }

    // Receive response (just check for 200 OK)
    char buffer[1024];
    int n = recv(sock, buffer, sizeof(buffer) - 1, 0);
    close(sock);

    if (n < 0)
    {
        std::cerr << "[SysPulse] Error: Failed to receive response" << std::endl;
        return false;
    }

    buffer[n] = '\0';
    std::string response(buffer);

    // Check if response contains "200 OK"
    if (response.find("200") != std::string::npos)
    {
        return true;
    }
    else
    {
        std::cerr << "[SysPulse] Server error: " << response.substr(0, 50) << std::endl;
        return false;
    }
}

int main()
{
    std::cout << "========================================" << std::endl;
    std::cout << "    SysPulse Agent v1.0.0" << std::endl;
    std::cout << "    Linux System Monitor Daemon" << std::endl;
    std::cout << "========================================" << std::endl;

    // Setup signal handlers
    std::signal(SIGINT, signalHandler);
    std::signal(SIGTERM, signalHandler);

    // Configuration
    const std::string serverHost = "127.0.0.1";
    const int serverPort = 3000;
    const int intervalMs = 1000; // 1 second

    std::cout << "[SysPulse] Target server: http://" << serverHost << ":" << serverPort << std::endl;
    std::cout << "[SysPulse] Update interval: " << intervalMs << "ms" << std::endl;
    std::cout << "[SysPulse] Press Ctrl+C to stop" << std::endl;
    std::cout << "----------------------------------------" << std::endl;

    // Initialize CPU tick reading
    CpuTicks prevTicks, currTicks;
    if (!readCpuTicks(prevTicks))
    {
        std::cerr << "[SysPulse] Failed to initialize CPU monitoring" << std::endl;
        return 1;
    }

    // Wait a bit before first measurement to get meaningful CPU delta
    std::this_thread::sleep_for(std::chrono::milliseconds(100));

    // Main monitoring loop
    while (g_running)
    {
        auto startTime = std::chrono::steady_clock::now();

        // Read current CPU ticks
        if (!readCpuTicks(currTicks))
        {
            std::cerr << "[SysPulse] Warning: Failed to read CPU ticks" << std::endl;
            std::this_thread::sleep_for(std::chrono::milliseconds(intervalMs));
            continue;
        }

        // Calculate CPU usage
        double cpuUsage = calculateCpuUsage(prevTicks, currTicks);
        prevTicks = currTicks;

        // Read RAM usage
        double ramUsage = readRamUsage();
        if (ramUsage < 0)
        {
            std::cerr << "[SysPulse] Warning: Failed to read RAM usage" << std::endl;
            std::this_thread::sleep_for(std::chrono::milliseconds(intervalMs));
            continue;
        }

        // Log current readings
        std::cout << "[SysPulse] CPU: " << std::fixed << std::setprecision(2) << cpuUsage
                  << "% | RAM: " << ramUsage << "%" << std::endl;

        // Send telemetry to server
        if (!sendTelemetry(serverHost, serverPort, cpuUsage, ramUsage))
        {
            std::cerr << "[SysPulse] Warning: Failed to send telemetry (server may be down)" << std::endl;
        }

        // Calculate sleep time to maintain consistent interval
        auto endTime = std::chrono::steady_clock::now();
        auto elapsed = std::chrono::duration_cast<std::chrono::milliseconds>(endTime - startTime);
        auto sleepTime = std::chrono::milliseconds(intervalMs) - elapsed;

        if (sleepTime.count() > 0)
        {
            std::this_thread::sleep_for(sleepTime);
        }
    }

    std::cout << "[SysPulse] Agent stopped." << std::endl;
    return 0;
}
