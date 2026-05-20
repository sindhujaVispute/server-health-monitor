# Server Health Monitoring Dashboard

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.9+](https://img.shields.io/badge/python-3.9+-blue.svg)](https://www.python.org/downloads/)
[![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=flat&logo=docker&logoColor=white)](https://www.docker.com/)
[![Flask](https://img.shields.io/badge/flask-%23000.svg?style=flat&logo=flask&logoColor=white)](https://flask.palletsprojects.com/)


## Overview

A real-time server health monitoring dashboard that tracks system metrics, provides historical trends, and sends alerts based on configurable thresholds. Built with Flask, psutil, and Chart.js, this project follows clean architecture principles and DevOps best practices.

**Live Demo:** [https://server-health-monitor.onrender.com](https://server-health-monitor.onrender.com) *(coming soon after deployment)*

## Features

### Core Features
- **Real-Time Monitoring** - Live metrics for CPU, RAM, Disk, Network, and System Uptime
- **Historical Trends** - 24-hour charts for CPU, Memory, and Disk usage
- **Alert System** - Configurable thresholds with visual warnings
- **Docker Support** - Monitor running container status
- **Responsive UI** - Modern dashboard with Dark/Light mode toggle
- **Export Functionality** - Export metrics to JSON/CSV format

### Technical Features
- **RESTful API** - Complete API for metric collection and management
- **Database Storage** - SQLite with easy PostgreSQL migration path
- **Production Ready** - Docker, CI/CD, and cloud deployment support
- **Clean Architecture** - Separation of concerns, modular design
- **Comprehensive Logging** - Centralized logging with rotation

## Tech Stack

### Backend
| Technology | Purpose |
|------------|---------|
| Python 3.9+ | Core application logic |
| Flask 2.3.3 | Web framework |
| psutil 5.9.5 | System metrics collection |
| SQLite | Historical data storage |
| Gunicorn | WSGI HTTP Server |

### Frontend
| Technology | Purpose |
|------------|---------|
| HTML5/CSS3 | Structure and styling |
| Bootstrap 5 | Responsive layout |
| Chart.js | Data visualization |
| JavaScript ES6 | Dynamic updates |

### DevOps
| Technology | Purpose |
|------------|---------|
| Docker | Containerization |
| Docker Compose | Multi-container orchestration |
| GitHub Actions | CI/CD pipeline |
| Git | Version control |

## 📋 Prerequisites

- Python 3.9 or higher
- pip (Python package manager)
- Docker and Docker Compose (optional)
- Git

## Quick Start

### Local Development

```bash
# Clone the repository
git clone https://github.com/yourusername/server-health-monitor.git
cd server-health-monitor

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Run the application
python app.py

# Access the dashboard
open http://localhost:5000
