// Global variables
let cpuChart, memoryDiskChart;
let updateInterval;
let currentTheme = localStorage.getItem('theme') || 'light';
let lastNetworkStats = null;
let lastNetworkTimestamp = null;
let networkUpdateCounter = 0;

// Store historical data for charts
let chartData = {
    timestamps: [],
    cpu: [],
    memory: [],
    disk: []
};

// Maximum number of points to show on chart
const MAX_CHART_POINTS = 30;

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    initializeCharts();
    loadHistoricalData();
    loadThresholds();
    startAutoRefresh();
    setupEventListeners();
    applyTheme(currentTheme);
});

function initializeCharts() {
    // CPU Chart
    const cpuCtx = document.getElementById('cpuChart').getContext('2d');
    cpuChart = new Chart(cpuCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'CPU Usage (%)',
                data: [],
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderWidth: 2,
                tension: 0.1,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            animation: {
                duration: 500
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Usage (%)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Time'
                    },
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45
                    }
                }
            },
            plugins: {
                tooltip: {
                    mode: 'index',
                    intersect: false
                },
                legend: {
                    position: 'top'
                }
            }
        }
    });
    
    // Memory & Disk Chart
    const memoryDiskCtx = document.getElementById('memoryDiskChart').getContext('2d');
    memoryDiskChart = new Chart(memoryDiskCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Memory Usage (%)',
                    data: [],
                    borderColor: 'rgb(255, 99, 132)',
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    borderWidth: 2,
                    tension: 0.1,
                    fill: true
                },
                {
                    label: 'Disk Usage (%)',
                    data: [],
                    borderColor: 'rgb(54, 162, 235)',
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    borderWidth: 2,
                    tension: 0.1,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            animation: {
                duration: 500
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Usage (%)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Time'
                    },
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45
                    }
                }
            },
            plugins: {
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            }
        }
    });
}

async function fetchCurrentMetrics() {
    try {
        const response = await fetch('/api/metrics/current');
        const data = await response.json();
        
        if (data.success) {
            updateDashboard(data.data);
            updateRealTimeCharts(data.data); 
            
            if (data.alerts && data.alerts.length > 0) {
                displayAlerts(data.alerts);
            }
        }
    } catch (error) {
        console.error('Error fetching metrics:', error);
    }
}

function updateDashboard(metrics) {
    // Update CPU
    const cpuPercent = metrics.cpu.percentage;
    document.getElementById('cpuValue').textContent = `${cpuPercent.toFixed(1)}%`;
    document.getElementById('cpuProgress').style.width = `${cpuPercent}%`;
    document.getElementById('cpuDetail').textContent = `Cores: ${metrics.cpu.cores}`;
    updateProgressBarColor('cpuProgress', cpuPercent);
    
    // Update RAM
    const ramPercent = metrics.memory.percentage;
    const ramUsedGB = (metrics.memory.used / (1024 ** 3)).toFixed(1);
    const ramTotalGB = (metrics.memory.total / (1024 ** 3)).toFixed(1);
    document.getElementById('ramValue').textContent = `${ramPercent.toFixed(1)}%`;
    document.getElementById('ramProgress').style.width = `${ramPercent}%`;
    document.getElementById('ramDetail').textContent = `Used: ${ramUsedGB} GB / ${ramTotalGB} GB`;
    updateProgressBarColor('ramProgress', ramPercent);
    
    // Update Disk
    const diskPercent = metrics.disk.percentage;
    const diskUsedGB = (metrics.disk.used / (1024 ** 3)).toFixed(1);
    const diskTotalGB = (metrics.disk.total / (1024 ** 3)).toFixed(1);
    document.getElementById('diskValue').textContent = `${diskPercent.toFixed(1)}%`;
    document.getElementById('diskProgress').style.width = `${diskPercent}%`;
    document.getElementById('diskDetail').textContent = `Used: ${diskUsedGB} GB / ${diskTotalGB} GB`;
    updateProgressBarColor('diskProgress', diskPercent);
    
    // Update Network - Show actual transfer rates
    networkUpdateCounter++;
    
    if (lastNetworkStats && lastNetworkTimestamp) {
        const currentTime = new Date(metrics.timestamp);
        const lastTime = new Date(lastNetworkTimestamp);
        const timeDiffSeconds = (currentTime - lastTime) / 1000;
        
        if (timeDiffSeconds > 0 && timeDiffSeconds < 10) {
            const bytesSentDiff = metrics.network.bytes_sent - lastNetworkStats.bytes_sent;
            const bytesRecvDiff = metrics.network.bytes_recv - lastNetworkStats.bytes_recv;
            
            const sendRateMBps = (bytesSentDiff / (1024 * 1024)) / timeDiffSeconds;
            const recvRateMBps = (bytesRecvDiff / (1024 * 1024)) / timeDiffSeconds;
            const totalRateMBps = sendRateMBps + recvRateMBps;
            
            if (totalRateMBps > 0) {
                document.getElementById('networkValue').textContent = `${totalRateMBps.toFixed(1)} MB/s`;
            } else {
                document.getElementById('networkValue').textContent = `${(sendRateMBps + recvRateMBps).toFixed(2)} MB/s`;
            }
            document.getElementById('networkDetail').innerHTML = `↓ ${recvRateMBps.toFixed(1)} MB/s ↑ ${sendRateMBps.toFixed(1)} MB/s`;
        } else {
            document.getElementById('networkValue').textContent = `0.0 MB/s`;
            document.getElementById('networkDetail').innerHTML = `↓ 0.0 MB/s ↑ 0.0 MB/s`;
        }
    } else {
        document.getElementById('networkValue').textContent = `0.0 MB/s`;
        document.getElementById('networkDetail').innerHTML = `↓ 0.0 MB/s ↑ 0.0 MB/s`;
    }
    
    // Store current stats for next calculation
    lastNetworkStats = {
        bytes_sent: metrics.network.bytes_sent,
        bytes_recv: metrics.network.bytes_recv
    };
    lastNetworkTimestamp = metrics.timestamp;
    
    // Update Uptime
    const uptimeDays = metrics.uptime.days.toFixed(1);
    const uptimeHours = metrics.uptime.hours.toFixed(0);
    const uptimeMinutes = metrics.uptime.minutes.toFixed(0);
    document.getElementById('uptimeValue').innerHTML = `Uptime: ${uptimeDays} days (${uptimeHours}h ${uptimeMinutes}m)`;
    
    // Update System Info
    document.getElementById('processCount').textContent = metrics.processes;
    document.getElementById('bootTime').textContent = new Date(metrics.uptime.boot_time).toLocaleString();
    document.getElementById('lastUpdate').textContent = new Date(metrics.timestamp).toLocaleTimeString();
    
    // Update Docker containers
    if (metrics.docker_containers && metrics.docker_containers.length > 0) {
        updateDockerList(metrics.docker_containers);
    }
}

// Update charts in real-time
function updateRealTimeCharts(metrics) {
    const now = new Date();
    const timeLabel = now.toLocaleTimeString();
    
    // Add new data points
    chartData.timestamps.push(timeLabel);
    chartData.cpu.push(metrics.cpu.percentage);
    chartData.memory.push(metrics.memory.percentage);
    chartData.disk.push(metrics.disk.percentage);
    
    // Keep only last MAX_CHART_POINTS points
    if (chartData.timestamps.length > MAX_CHART_POINTS) {
        chartData.timestamps.shift();
        chartData.cpu.shift();
        chartData.memory.shift();
        chartData.disk.shift();
    }
    
    // Update CPU Chart
    cpuChart.data.labels = [...chartData.timestamps];
    cpuChart.data.datasets[0].data = [...chartData.cpu];
    cpuChart.update('none'); // 'none' for smooth animation
    
    // Update Memory & Disk Chart
    memoryDiskChart.data.labels = [...chartData.timestamps];
    memoryDiskChart.data.datasets[0].data = [...chartData.memory];
    memoryDiskChart.data.datasets[1].data = [...chartData.disk];
    memoryDiskChart.update('none');
    
    //  animation effect to charts
    animateChartUpdate();
}

function animateChartUpdate() {
    const charts = document.querySelectorAll('canvas');
    charts.forEach(chart => {
        chart.style.transition = 'box-shadow 0.3s';
        chart.style.boxShadow = '0 0 10px rgba(75, 192, 192, 0.5)';
        setTimeout(() => {
            chart.style.boxShadow = '';
        }, 300);
    });
}

function updateProgressBarColor(elementId, value) {
    const element = document.getElementById(elementId);
    if (value < 70) {
        element.className = 'progress-bar bg-success';
    } else if (value < 85) {
        element.className = 'progress-bar bg-warning';
    } else {
        element.className = 'progress-bar bg-danger';
    }
}

function updateDockerList(containers) {
    const dockerList = document.getElementById('dockerList');
    
    if (!containers || containers.length === 0) {
        dockerList.innerHTML = '<div class="text-muted">No Docker containers found</div>';
        return;
    }
    
    let html = '';
    containers.forEach(container => {
        const statusClass = container.status === 'running' ? 'status-running' : 'status-exited';
        const statusIcon = container.status === 'running' ? '▶️' : '⏹️';
        html += `
            <div class="docker-container">
                <strong><i class="fab fa-docker"></i> ${statusIcon} ${container.name}</strong>
                <span class="container-status ${statusClass}">${container.status}</span>
                <div class="small text-muted">Image: ${container.image}</div>
            </div>
        `;
    });
    
    dockerList.innerHTML = html;
}

function displayAlerts(alerts) {
    const alertsList = document.getElementById('alertsList');
    
    if (!alerts || alerts.length === 0) {
        alertsList.innerHTML = '<div class="alert alert-success">✅ No active alerts - System is healthy!</div>';
        return;
    }
    
    let html = '';
    alerts.forEach(alert => {
        const alertClass = alert.severity === 'critical' ? 'alert-danger' : 'alert-warning';
        const icon = alert.severity === 'critical' ? '🔴' : '⚠️';
        html += `
            <div class="alert ${alertClass} alert-dismissible fade show" role="alert">
                <strong>${icon} ${alert.type} Alert</strong><br>
                ${alert.message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
    });
    
    alertsList.innerHTML = html;
}

async function loadHistoricalData() {
    try {
        const response = await fetch('/api/metrics/history?hours=24');
        const data = await response.json();
        
        if (data.success && data.data.length > 0) {
            // Load historical data into the chart
            const history = data.data;
            const lastN = Math.min(MAX_CHART_POINTS, history.length);
            const recentHistory = history.slice(-lastN);
            
            chartData.timestamps = recentHistory.map(h => new Date(h.timestamp).toLocaleTimeString());
            chartData.cpu = recentHistory.map(h => h.cpu);
            chartData.memory = recentHistory.map(h => h.memory);
            chartData.disk = recentHistory.map(h => h.disk);
            
            updateChartsFromHistory();
        } else {
            console.log('No historical data available yet - starting fresh');
            // Initialize empty charts
            chartData = { timestamps: [], cpu: [], memory: [], disk: [] };
        }
    } catch (error) {
        console.error('Error loading historical data:', error);
    }
}

function updateChartsFromHistory() {
    // Update CPU Chart with historical data
    cpuChart.data.labels = [...chartData.timestamps];
    cpuChart.data.datasets[0].data = [...chartData.cpu];
    cpuChart.update();
    
    // Update Memory & Disk Chart with historical data
    memoryDiskChart.data.labels = [...chartData.timestamps];
    memoryDiskChart.data.datasets[0].data = [...chartData.memory];
    memoryDiskChart.data.datasets[1].data = [...chartData.disk];
    memoryDiskChart.update();
}

async function loadThresholds() {
    try {
        const response = await fetch('/api/thresholds');
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('cpuThreshold').value = data.data.cpu;
            document.getElementById('memoryThreshold').value = data.data.memory;
            document.getElementById('diskThreshold').value = data.data.disk;
        }
    } catch (error) {
        console.error('Error loading thresholds:', error);
    }
}

async function saveThresholds() {
    const thresholds = {
        cpu: parseFloat(document.getElementById('cpuThreshold').value),
        memory: parseFloat(document.getElementById('memoryThreshold').value),
        disk: parseFloat(document.getElementById('diskThreshold').value)
    };
    
    try {
        for (const [metric, value] of Object.entries(thresholds)) {
            await fetch('/api/thresholds', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    metric_type: metric,
                    value: value
                })
            });
        }
        
        showNotification('✅ Thresholds updated successfully!', 'success');
        const modal = bootstrap.Modal.getInstance(document.getElementById('thresholdModal'));
        modal.hide();
    } catch (error) {
        console.error('Error saving thresholds:', error);
        showNotification('❌ Error saving thresholds', 'error');
    }
}

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type === 'success' ? 'success' : 'danger'} position-fixed top-0 end-0 m-3`;
    notification.style.zIndex = '9999';
    notification.style.animation = 'slideIn 0.3s ease-out';
    notification.innerHTML = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

async function exportMetrics() {
    try {
        const format = confirm('Export as JSON? Click OK for JSON, Cancel for CSV');
        const formatType = format ? 'json' : 'csv';
        window.location.href = `/api/export?format=${formatType}&hours=24`;
        showNotification(`📊 Exporting metrics as ${formatType.toUpperCase()}...`, 'success');
    } catch (error) {
        console.error('Error exporting metrics:', error);
        showNotification('❌ Error exporting metrics', 'error');
    }
}

function toggleTheme() {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    applyTheme(currentTheme);
    localStorage.setItem('theme', currentTheme);
}

function applyTheme(theme) {
    if (theme === 'dark') {
        document.body.classList.add('dark-mode');
        document.getElementById('themeToggle').innerHTML = '<i class="fas fa-sun"></i> Light Mode';
    } else {
        document.body.classList.remove('dark-mode');
        document.getElementById('themeToggle').innerHTML = '<i class="fas fa-moon"></i> Dark Mode';
    }
}

function startAutoRefresh() {
    // Initial load
    fetchCurrentMetrics();
    loadHistoricalData();
    
    // Set up interval for real-time updates
    updateInterval = setInterval(() => {
        fetchCurrentMetrics();
        addRefreshAnimation();
    }, 2000);
}

function addRefreshAnimation() {
    const indicator = document.createElement('div');
    indicator.className = 'refresh-indicator refreshing';
    indicator.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i> Updating...';
    document.body.appendChild(indicator);
    
    setTimeout(() => {
        indicator.remove();
    }, 500);
}

function setupEventListeners() {
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    document.getElementById('exportBtn').addEventListener('click', exportMetrics);
    document.getElementById('configureAlertsBtn').addEventListener('click', () => {
        const modal = new bootstrap.Modal(document.getElementById('thresholdModal'));
        modal.show();
    });
    document.getElementById('saveThresholds').addEventListener('click', saveThresholds);
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (updateInterval) {
        clearInterval(updateInterval);
    }
});

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .refresh-indicator {
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: var(--card-bg);
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 12px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        z-index: 1000;
        animation: slideIn 0.3s ease-out;
    }
    
    .fa-spin {
        animation: fa-spin 2s infinite linear;
    }
    
    @keyframes fa-spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);