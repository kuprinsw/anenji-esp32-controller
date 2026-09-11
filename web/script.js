// ANENJI ESP32 Controller - Web Interface

const CONFIG = {
    API_BASE: '/api',
    UPDATE_INTERVAL: 5000, // 5 секунд
    FAULT_CODES: {
        1: 'Перегрів модуля інвертора',
        2: 'Перегрів модуля DCDC',
        4: 'Перевищена напруга батареї',
        8: 'Перегрів сонячних панелей',
        16: 'Коротке замикання на виході',
        32: 'Перевищена напруга інвертора',
        64: 'Перевантаження на виході',
        128: 'Перевищена напруга шини',
        256: 'Тайм-аут м`якого запуску шини',
        512: 'Перевищена потужність сонячних панелей',
        1024: 'Перевищена напруга сонячних панелей',
        2048: 'Перевищена потужність батареї',
        4096: 'Перевищена потужність інвертора',
        8192: 'Низька напруга шини',
    },
    WARNING_CODES: {
        2: 'Аномальна форма хвилі мережі',
        8: 'Низька напруга мережі',
        16: 'Висока частота мережі',
        32: 'Низька частота мережи',
        64: 'Низька напруга сонячних панелей',
        128: 'Перегрів',
        256: 'Низька напруга батареї',
        512: 'Батарея не підключена',
        1024: 'Перевантаження',
        2048: 'Вирівнювання батареї',
        4096: 'Занизька напруга батареї',
        8192: 'Зниження потужності на виході',
        16384: 'Вентилятор заблокований',
    }
};

// DOM елементи
const elements = {
    status: document.getElementById('status'),
    lastUpdate: document.getElementById('last_update'),
    // Параметри
    operation_mode: document.getElementById('operation_mode'),
    battery_soc: document.getElementById('battery_soc'),
    inverter_temperature: document.getElementById('inverter_temperature'),
    dcdc_temperature: document.getElementById('dcdc_temperature'),
    ac_voltage: document.getElementById('ac_voltage'),
    ac_frequency: document.getElementById('ac_frequency'),
    avg_mains_power: document.getElementById('avg_mains_power'),
    inverter_voltage: document.getElementById('inverter_voltage'),
    inverter_current: document.getElementById('inverter_current'),
    avg_inverter_power: document.getElementById('avg_inverter_power'),
    output_voltage: document.getElementById('output_voltage'),
    output_current: document.getElementById('output_current'),
    output_active_power: document.getElementById('output_active_power'),
    battery_voltage: document.getElementById('battery_voltage'),
    battery_current: document.getElementById('battery_current'),
    battery_power: document.getElementById('battery_power'),
    pv_voltage: document.getElementById('pv_voltage'),
    pv_current: document.getElementById('pv_current'),
    pv_power: document.getElementById('pv_power'),
    load_percentage: document.getElementById('load_percentage'),
    fault_codes: document.getElementById('fault_codes'),
    warning_codes: document.getElementById('warning_codes'),
};

// Кеш даних
let dataCache = {};
let isConnected = false;
let updateInterval;

// Ініціалізація
document.addEventListener('DOMContentLoaded', () => {
    console.log('Ініціалізація ANENJI контролера...');
    updateData();
    updateInterval = setInterval(updateData, CONFIG.UPDATE_INTERVAL);
});

// Завдання закриття
window.addEventListener('beforeunload', () => {
    if (updateInterval) {
        clearInterval(updateInterval);
    }
});

// Отримання даних
async function updateData() {
    try {
        // Отримуємо статус через REST API
        const response = await fetch('/status');
        
        if (!response.ok) {
            throw new Error('API відповідь помилка');
        }

        const data = await response.json();
        dataCache = data;
        
        updateUI(data);
        setConnected(true);
    } catch (error) {
        console.error('Помилка отримання даних:', error);
        setConnected(false);
    }
}

// Оновлення UI
function updateUI(data) {
    // Перевіряємо наявність кожного елемента перед оновленням
    Object.keys(elements).forEach(key => {
        if (elements[key] && data[key] !== undefined) {
            let value = data[key];
            
            // Форматування значень
            if (typeof value === 'number') {
                if (key.includes('temperature')) {
                    value = value.toFixed(0) + '°C';
                } else if (key.includes('voltage')) {
                    value = value.toFixed(1) + 'V';
                } else if (key.includes('current')) {
                    value = value.toFixed(1) + 'A';
                } else if (key.includes('frequency')) {
                    value = value.toFixed(2) + 'Hz';
                } else if (key.includes('power')) {
                    value = value.toFixed(0) + 'W';
                } else if (key.includes('soc') || key.includes('percentage')) {
                    value = value.toFixed(0) + '%';
                }
            }
            
            elements[key].textContent = value || '-';
        }
    });

    // Оновлення часу
    elements.lastUpdate.textContent = new Date().toLocaleTimeString('uk-UA');

    // Оновлення кодів помилок
    if (data.fault_code) {
        displayFaultCodes(data.fault_code);
    }

    // Оновлення кодів попережень
    if (data.warning_code) {
        displayWarningCodes(data.warning_code);
    }
}

// Відображення кодів помилок
function displayFaultCodes(faultCode) {
    if (!faultCode || faultCode === 0) {
        elements.fault_codes.textContent = 'Немає помилок';
        elements.fault_codes.className = 'alert-list success';
        return;
    }

    const faults = [];
    Object.entries(CONFIG.FAULT_CODES).forEach(([code, message]) => {
        if (faultCode & parseInt(code)) {
            faults.push(message);
        }
    });

    if (faults.length === 0) {
        elements.fault_codes.textContent = 'Немає помилок';
        elements.fault_codes.className = 'alert-list success';
    } else {
        elements.fault_codes.innerHTML = faults.map(f => `• ${f}`).join('<br>');
        elements.fault_codes.className = 'alert-list has-errors';
    }
}

// Відображення кодів попережень
function displayWarningCodes(warningCode) {
    if (!warningCode || warningCode === 0) {
        elements.warning_codes.textContent = 'Немає попережень';
        elements.warning_codes.className = 'alert-list success';
        return;
    }

    const warnings = [];
    Object.entries(CONFIG.WARNING_CODES).forEach(([code, message]) => {
        if (warningCode & parseInt(code)) {
            warnings.push(message);
        }
    });

    if (warnings.length === 0) {
        elements.warning_codes.textContent = 'Немає попережень';
        elements.warning_codes.className = 'alert-list success';
    } else {
        elements.warning_codes.innerHTML = warnings.map(w => `• ${w}`).join('<br>');
        elements.warning_codes.className = 'alert-list warning';
    }
}

// Встановлення статусу підключення
function setConnected(connected) {
    isConnected = connected;
    
    if (connected) {
        elements.status.textContent = '✓ Підключено';
        elements.status.className = 'status-indicator connected';
    } else {
        elements.status.textContent = '✗ Не підключено';
        elements.status.className = 'status-indicator disconnected';
    }
}

// Посилання на селекти для управління
const selects = [
    'output_mode',
    'output_priority',
    'battery_type'
];

selects.forEach(selectId => {
    const selectElement = document.getElementById(selectId);
    if (selectElement) {
        selectElement.addEventListener('change', (e) => {
            sendCommand(selectId, e.target.value);
        });
    }
});

// Відправка команди
async function sendCommand(entity, value) {
    try {
        const response = await fetch('/api/set', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                entity: entity,
                value: value
            })
        });

        if (!response.ok) {
            throw new Error('Помилка при відправці команди');
        }

        console.log(`Команда відправлена: ${entity} = ${value}`);
        
        // Оновлюємо дані через 1 секунду
        setTimeout(updateData, 1000);
    } catch (error) {
        console.error('Помилка:', error);
        alert('Помилка при відправці команди');
    }
}

// Автоматичне оновлення статусу кожні 30 сек
setInterval(() => {
    if (!isConnected) {
        updateData();
    }
}, 30000);
