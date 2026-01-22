cmake_minimum_required(VERSION 3.14)
project(SysPulseAgent VERSION 1.0.0 LANGUAGES CXX)

# C++17 standard
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Build type defaults to Release
if(NOT CMAKE_BUILD_TYPE)
    set(CMAKE_BUILD_TYPE Release)
endif()

# Compiler flags
set(CMAKE_CXX_FLAGS_DEBUG "-g -O0 -Wall -Wextra -Wpedantic")
set(CMAKE_CXX_FLAGS_RELEASE "-O3 -DNDEBUG")

# Create executable
add_executable(syspulse_agent main.cpp)

# Include local header-only libraries
target_include_directories(syspulse_agent PRIVATE ${CMAKE_SOURCE_DIR}/include)

# Required for threading support
find_package(Threads REQUIRED)
target_link_libraries(syspulse_agent PRIVATE Threads::Threads)

# Installation
install(TARGETS syspulse_agent RUNTIME DESTINATION bin)

# Print build info
message(STATUS "")
message(STATUS "========================================")
message(STATUS "  SysPulse Agent Build Configuration")
message(STATUS "========================================")
message(STATUS "  Version:      ${PROJECT_VERSION}")
message(STATUS "  Build type:   ${CMAKE_BUILD_TYPE}")
message(STATUS "  C++ Standard: ${CMAKE_CXX_STANDARD}")
message(STATUS "========================================")
message(STATUS "")
