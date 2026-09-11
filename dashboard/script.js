// ANENJI Dashboard - Main Script

const CONFIG = {
  API_ENDPOINT: '',
  UPDATE_INTERVAL: 10000, // 10 seconds
  CHART_MAX_POINTS: 144, // 24 hours with 10-sec intervals
  THEME_KEY: 'anenji-theme',
  FAULT_CODES: {
    1: 'Перегрів модуля інвертора',
    2: 'Перегрів модуля DCDC',
    4: 'Перевищена напруга батареї',
    8: 'Перегрів сонячних панелей',
    16: 'Коротке замикання на виході',
    32: 'Перевищена напруга інвертора',
    64: 'Перевантаження на виході',
    128: 'Перевищена напруга шини',
  },
  WARNING_CODES: {
    2: 'Аномальна форма хвилі мережі',
    8: 'Низька напруга мережі',
    16: 'Висока частота мережі',
    32: 'Низька частота мережі',
    64: 'Низька напруга сонячних панелей',
    128: 'Перегрів',
    256: 'Низька напруга батареї',
    512: 'Батарея не підключена',
    1024: 'Перевантаження',
  }
};

let dataCache = {};
let isConnected = false;
let powerData = [];
let socData = [];
let charts = {};

// DOM Elements
const elements = {
  connectionStatus: document.getElementById('connectionStatus'),
  statusText: document.getElementById('statusText'),
  statusDot: document.querySelector('.status-dot'),
  themeToggle: document.getElementById('themeToggle'),
  
  // Status
  socValue: document.getElementById('socValue'),
  socBar: document.getElementById('socBar'),
  modeValue: document.getElementById('modeValue'),
  modeBadge: document.getElementById('modeBadge'),
  tempValue: document.getElementById('tempValue'),
  tempIndicator: document.getElementById('tempIndicator'),
  
  // Battery
  batteryVoltage: document.getElementById('batteryVoltage'),
  batteryCurrent: document.getElementById('batteryCurrent'),
  batteryPower: document.getElementById('batteryPower'),
  
  // PV
  pvVoltage: document.getElementById('pvVoltage'),
  pvCurrent: document.getElementById('pvCurrent'),
  pvPower: document.getElementById('pvPower'),
  
  // Output
  outputVoltage: document.getElementById('outputVoltage'),
  outputCurrent: document.getElementById('outputCurrent'),
  outputPower: document.getElementById('outputPower'),
  
  // AC
  acVoltage: document.getElementById('acVoltage'),
  acFrequency: document.getElementById('acFrequency'),
  acPower: document.getElementById('acPower'),
  
  // Alerts
  faultList: document.getElementById('faultList'),
  warningList: document.getElementById('warningList'),
  
  // Controls
  outputMode: document.getElementById('outputMode'),
  outputPriority: document.getElementById('outputPriority'),
  batteryType: document.getElementById('batteryType'),
  
  // Switches
  energySavingSwitch: document.getElementById('energySavingSwitch'),
  overloadRestartSwitch: document.getElementById('overloadRestartSwitch'),
  tempRestartSwitch: document.getElementById('tempRestartSwitch'),
  
  // Sliders
  maxChargingCurrent: document.getElementById('maxChargingCurrent'),
  maxChargingCurrentValue: document.getElementById('maxChargingCurrentValue'),
  outputVoltageSlider: document.getElementById('outputVoltage'),
  outputVoltageValue: document.getElementById('outputVoltageValue'),
  
  // Buttons
  exitFaultBtn: document.getElementById('exitFaultBtn'),
  restartBtn: document.getElementById('restartBtn'),
  refreshBtn: document.getElementById('refreshBtn'),
  
  // Footer
  lastUpdate: document.getElementById('lastUpdate'),
  wifiSignal: document.getElementById('wifiSignal'),
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Ініціалізація ANENJI Dashboard...');
  
  setupTheme();
  setupCharts();
  setupEventListeners();
  updateData();
  
  setInterval(updateData, CONFIG.UPDATE_INTERVAL);
});

// ==================== THEME ====================
function setupTheme() {
  const savedTheme = localStorage.getItem(CONFIG.THEME_KEY) || 'dark-theme';
  document.body.className = savedTheme;
  updateThemeIcon();
  
  elements.themeToggle.addEventListener('click', toggleTheme);
}

function toggleTheme() {
  const currentTheme = document.body.className;
  const newTheme = currentTheme === 'dark-theme' ? 'light-theme' : 'dark-theme';
  
  document.body.className = newTheme;
  localStorage.setItem(CONFIG.THEME_KEY, newTheme);
  updateThemeIcon();
  
  // Redraw charts with new theme
  if (charts.power) {
    charts.power.destroy();
    setupPowerChart();
  }
  if (charts.soc) {
    charts.soc.destroy();
    setupSocChart();
  }
}

function updateThemeIcon() {
  const isDark = document.body.className === 'dark-theme';
  elements.themeToggle.textContent = isDark ? '☀️' : '🌙';
}

// ==================== DATA FETCHING ====================
async function updateData() {
  try {
    const response = await fetch('/api/states');
    
    if (!response.ok) {
      throw new Error('API помилка');
    }

    const states = await response.json();
    
    // Convert to expected format
    const data = {};
    states.forEach(state => {
      data[state.entity_id] = {
        value: state.state,
        unit: state.attributes?.unit_of_measurement || '',
        friendly_name: state.attributes?.friendly_name || ''
      };
    });
    
    dataCache = data;
    updateUI(data);
    setConnected(true);
    
    // Add to chart data
    addChartData();
  } catch (error) {
    console.error('❌ Помилка оновлення:', error);
    setConnected(false);
  }
}

// ==================== UI UPDATE ====================
function updateUI(data) {
  // Status
  updateStatusCard(data);
  
  // Battery
  updateValue(elements.batteryVoltage, data['battery_voltage']?.value, 'V');
  updateValue(elements.batteryCurrent, data['battery_current']?.value, 'A');
  updateValue(elements.batteryPower, data['battery_power']?.value, 'W');
  
  // PV
  updateValue(elements.pvVoltage, data['pv_voltage']?.value, 'V');
  updateValue(elements.pvCurrent, data['pv_current']?.value, 'A');
  updateValue(elements.pvPower, data['pv_power']?.value, 'W');
  
  // Output
  updateValue(elements.outputVoltage, data['output_voltage']?.value, 'V');
  updateValue(elements.outputCurrent, data['output_current']?.value, 'A');
  updateValue(elements.outputPower, data['output_active_power']?.value, 'W');
  
  // AC
  updateValue(elements.acVoltage, data['ac_voltage']?.value, 'V');
  updateValue(elements.acFrequency, data['ac_frequency']?.value, 'Hz');
  updateValue(elements.acPower, data['average_mains_power']?.value, 'W');
  
  // Alerts
  updateAlerts(data);
  
  // Time
  elements.lastUpdate.textContent = new Date().toLocaleTimeString('uk-UA');
}

function updateStatusCard(data) {
  // SOC
  const soc = parseFloat(data['battery_soc']?.value) || 0;
  elements.socValue.textContent = soc.toFixed(0) + '%';
  elements.socBar.style.width = soc + '%';
  
  // Mode
  const mode = data['operation_mode']?.value || '-';
  elements.modeValue.textContent = mode;
  elements.modeBadge.textContent = getModeBadgeColor(mode);
  
  // Temperature
  const temp = parseFloat(data['inverter_temperature']?.value) || 0;
  elements.tempValue.textContent = temp.toFixed(0) + '°C';
  updateTempIndicator(temp);
}

function updateValue(element, value, unit = '') {
  if (element && value !== undefined) {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      element.textContent = numValue.toFixed(1) + (unit ? ' ' + unit : '');
    } else {
      element.textContent = value;
    }
  }
}

function getModeBadgeColor(mode) {
  const modes = {
    'Power On': '🔴 Ввімкнено',
    'Standby': '⚪ Резервний',
    'Mains': '🟢 Від мережі',
    'Off-Grid': '🟡 Від батареї',
    'Bypass': '🔵 Байпас',
    'Charging': '🟣 Зарядка',
    'Fault': '❌ Помилка'
  };
  return modes[mode] || mode;
}

function updateTempIndicator(temp) {
  const indicator = elements.tempIndicator;
  indicator.className = 'temp-indicator';
  
  if (temp < 30) indicator.classList.add('cold');
  else if (temp < 50) indicator.classList.add('normal');
  else if (temp < 70) indicator.classList.add('hot');
  else indicator.classList.add('critical');
}

// ==================== ALERTS ====================
function updateAlerts(data) {
  const faultCode = parseInt(data['fault_code']?.value) || 0;
  const warningCode = parseInt(data['warning_code']?.value) || 0;
  
  // Faults
  if (faultCode === 0) {
    elements.faultList.textContent = '✅ Немає помилок';
    elements.faultList.className = 'alert-list success';
  } else {
    const faults = [];
    Object.entries(CONFIG.FAULT_CODES).forEach(([code, msg]) => {
      if (faultCode & parseInt(code)) {
        faults.push('⚠️ ' + msg);
      }
    });
    elements.faultList.innerHTML = faults.join('<br>');
    elements.faultList.className = 'alert-list error';
  }
  
  // Warnings
  if (warningCode === 0) {
    elements.warningList.textContent = '✅ Немає попережень';
    elements.warningList.className = 'alert-list success';
  } else {
    const warnings = [];
    Object.entries(CONFIG.WARNING_CODES).forEach(([code, msg]) => {
      if (warningCode & parseInt(code)) {
        warnings.push('⚠️ ' + msg);
      }
    });
    elements.warningList.innerHTML = warnings.join('<br>');
    elements.warningList.className = 'alert-list';
  }
}

// ==================== CONNECTION STATUS ====================
function setConnected(connected) {
  isConnected = connected;
  
  if (connected) {
    elements.statusText.textContent = '✓ Підключено';
    elements.statusDot.className = 'status-dot connected';
  } else {
    elements.statusText.textContent = '✗ Не підключено';
    elements.statusDot.className = 'status-dot disconnected';
  }
}

// ==================== CHARTS ====================
function setupCharts() {
  setupPowerChart();
  setupSocChart();
}

function setupPowerChart() {
  const ctx = document.getElementById('powerChart')?.getContext('2d');
  if (!ctx) return;
  
  const isDark = document.body.className === 'dark-theme';
  const textColor = isDark ? '#eeeeee' : '#333333';
  const gridColor = isDark ? '#404040' : '#e0e0e0';
  
  charts.power = new Chart(ctx, {
    type: 'line',
    data: {
      labels: powerData.map((_, i) => ''),
      datasets: [
        {
          label: 'Сонячні панелі (W)',
          data: powerData.map(d => d.pv),
          borderColor: '#FF9800',
          backgroundColor: 'rgba(255, 152, 0, 0.1)',
          tension: 0.4,
          fill: true
        },
        {
          label: 'Вихід (W)',
          data: powerData.map(d => d.output),
          borderColor: '#2196F3',
          backgroundColor: 'rgba(33, 150, 243, 0.1)',
          tension: 0.4,
          fill: true
        },
        {
          label: 'Батарея (W)',
          data: powerData.map(d => d.battery),
          borderColor: '#4CAF50',
          backgroundColor: 'rgba(76, 175, 80, 0.1)',
          tension: 0.4,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: textColor }
        }
      },
      scales: {
        y: {
          ticks: { color: textColor },
          grid: { color: gridColor }
        },
        x: {
          ticks: { color: textColor },
          grid: { color: gridColor }
        }
      }
    }
  });
}

function setupSocChart() {
  const ctx = document.getElementById('socChart')?.getContext('2d');
  if (!ctx) return;
  
  const isDark = document.body.className === 'dark-theme';
  const textColor = isDark ? '#eeeeee' : '#333333';
  const gridColor = isDark ? '#404040' : '#e0e0e0';
  
  charts.soc = new Chart(ctx, {
    type: 'line',
    data: {
      labels: socData.map((_, i) => ''),
      datasets: [{
        label: 'SOC Батареї (%)',
        data: socData,
        borderColor: '#2196F3',
        backgroundColor: 'rgba(33, 150, 243, 0.2)',
        tension: 0.4,
        fill: true,
        pointRadius: 0,
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: textColor } }
      },
      scales: {
        y: {
          min: 0,
          max: 100,
          ticks: { color: textColor },
          grid: { color: gridColor }
        },
        x: {
          ticks: { color: textColor },
          grid: { color: gridColor }
        }
      }
    }
  });
}

function addChartData() {
  const soc = parseFloat(dataCache['battery_soc']?.value) || 0;
  const pv = parseFloat(dataCache['pv_power']?.value) || 0;
  const output = parseFloat(dataCache['output_active_power']?.value) || 0;
  const battery = parseFloat(dataCache['battery_power']?.value) || 0;
  
  // Keep only last 144 points (24 hours)
  if (powerData.length >= CONFIG.CHART_MAX_POINTS) {
    powerData.shift();
    socData.shift();
  }
  
  powerData.push({ pv, output, battery });
  socData.push(soc);
  
  // Update charts
  if (charts.power) {
    charts.power.data.datasets[0].data = powerData.map(d => d.pv);
    charts.power.data.datasets[1].data = powerData.map(d => d.output);
    charts.power.data.datasets[2].data = powerData.map(d => d.battery);
    charts.power.update('none');
  }
  
  if (charts.soc) {
    charts.soc.data.datasets[0].data = socData;
    charts.soc.update('none');
  }
}

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
  elements.exitFaultBtn?.addEventListener('click', () => sendCommand('exit_fault'));
  elements.restartBtn?.addEventListener('click', () => sendCommand('restart'));
  elements.refreshBtn?.addEventListener('click', updateData);
  
  // Controls
  elements.outputMode?.addEventListener('change', (e) => sendCommand('set_output_mode', e.target.value));
  elements.outputPriority?.addEventListener('change', (e) => sendCommand('set_output_priority', e.target.value));
  elements.batteryType?.addEventListener('change', (e) => sendCommand('set_battery_type', e.target.value));
  
  // Switches
  elements.energySavingSwitch?.addEventListener('change', (e) => sendCommand('set_energy_saving', e.target.checked));
  elements.overloadRestartSwitch?.addEventListener('change', (e) => sendCommand('set_overload_restart', e.target.checked));
  elements.tempRestartSwitch?.addEventListener('change', (e) => sendCommand('set_temp_restart', e.target.checked));
  
  // Sliders
  elements.maxChargingCurrent?.addEventListener('input', (e) => {
    elements.maxChargingCurrentValue.textContent = e.target.value + ' A';
  });
  elements.maxChargingCurrent?.addEventListener('change', (e) => {
    sendCommand('set_max_charging_current', e.target.value);
  });
  
  elements.outputVoltageSlider?.addEventListener('input', (e) => {
    elements.outputVoltageValue.textContent = e.target.value + ' V';
  });
  elements.outputVoltageSlider?.addEventListener('change', (e) => {
    sendCommand('set_output_voltage', e.target.value);
  });
}

// ==================== COMMANDS ====================
async function sendCommand(command, value = null) {
  try {
    const payload = { command };
    if (value !== null) payload.value = value;
    
    const response = await fetch('/api/command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) throw new Error('Помилка команди');
    
    console.log('✅ Команда відправлена:', command);
    setTimeout(updateData, 1000);
  } catch (error) {
    console.error('❌ Помилка команди:', error);
  }
}
