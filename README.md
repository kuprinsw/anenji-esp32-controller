# ANENJI ESP32 Controller

Незалежний контролер для ANENJI інвертора на базі ESP32 з веб-інтерфейсом.

## Можливості

- 📊 Моніторинг всіх параметрів інвертора (напруга, струм, потужність, SOC)
- 🌐 Веб-інтерфейс для керування та перегляду
- ⚙️ Налаштування параметрів через веб
- 📱 Адаптивний дизайн (мобільний/планшет/ПК)
- 🔋 Підтримка RS485 Modbus протоколу
- 🚫 Без прив'язки до Home Assistant

## Апаратне забезпечення

- ESP32 (розроблено на ESP32-DevKitC)
- Модуль RS485 (MAX485 або подібний)
- Кабель RS485 для інвертора ANENJI

### Підключення до ESP32

```
RS485 Module -> ESP32
-----------------------
DI (TX)      -> GPIO17 (TX2)
RO (RX)      -> GPIO16 (RX2)
DE/RE        -> GPIO4
GND          -> GND
5V           -> 5V
```

## Встановлення

### 1. Клонуємо репозиторій
```bash
git clone https://github.com/kuprinsw/anenji-esp32-controller.git
cd anenji-esp32-controller
```

### 2. Встановлюємо ESPHome
```bash
pip install esphome
```

### 3. Налаштовуємо WiFi
Відредагуйте `secrets.yaml`:
```yaml
wifi_ssid: "ВАШ_WiFi"
wifi_password: "ВАШ_ПАРОЛЬ"
```

### 4. Збираємо прошивку
```bash
esphome run anenji-esp32.yaml
```

Або для отримання BIN файлу:
```bash
esphome compile anenji-esp32.yaml
```

BIN файл буде в `.esphome/build/anenji-esp32/firmware.bin`

### 5. Прошиваємо ESP32

#### З USB кабелем:
```bash
esphome flash anenji-esp32.yaml --usb-port /dev/ttyUSB0
```

#### Використовуючи esptool.py:
```bash
piped esptool.py -p /dev/ttyUSB0 write_flash 0x0 firmware.bin
```

## Використання

1. Підключіть ESP32 до WiFi
2. Знайдіть IP адресу у вашому WiFi маршрутизаторі
3. Відкрийте браузер: `http://<IP_ADDRESS>`
4. Насолоджуйтесь моніторингом! 📊

## Веб-інтерфейс

Дашборд показує:

### Основні параметри
- Режим роботи (Power On, Standby, Mains, Off-Grid, Bypass, Charging, Fault)
- Стан батареї (SOC %)
- Температура
- Коди помилок та попереджень

### Параметри мережі (AC)
- Напруга
- Частота
- Потужність

### Параметри інвертора
- Вихідна напруга/струм/частота
- Активна і повна потужність

### Параметри батареї
- Напруга
- Струм (зарядка/розрядка)
- Потужність

### Параметри сонячних панелей
- Напруга
- Струм
- Потужність

## Налаштування

З веб-інтерфейсу можна змінювати:
- Режим виходу (Single, Parallel, Phase P1/P2/P3)
- Пріоритет джерела (Utility, PV, Battery)
- Діапазон вхідної напруги
- Тип батареї (AGM, Li, тощо)
- Режими автоперезавантаження

## Структура проекту

```
anenji-esp32-controller/
├── anenji-esp32.yaml          # ESPHome конфіг
├── secrets.yaml               # WiFi налаштування
├── README.md                  # Документація
└── web/
    ├── index.html            # Веб-інтерфейс
    ├── style.css             # Стилі
    └── script.js             # JavaScript
```

## Розширена конфігурація

Для більшої гнучкості можна додати параметри контролю (number entities):
```yaml
number:
  - platform: modbus_controller
    modbus_controller_id: smg0
    name: "max charging current"
    address: 332
    value_type: U_WORD
    min_value: 0
    max_value: 100
    step: 0.1
    unit_of_measurement: "A"
    lambda: "return x * 0.1f;"
    write_lambda: "return x * 10.0f;"
```

## Стан розробки

✅ Базова конфігурація  
✅ Модbus Modbus читання  
✅ Базовий веб-інтерфейс  
🔄 Розширений веб-інтерфейс з графіками  
🔄 API для мобільних додатків  
🔄 Логування даних  

## Усередині

Якщо у вас є проблеми:

1. Перевірте під'єднання RS485
2. Перевірте логи: `esphome logs anenji-esp32.yaml`
3. Переконайтеся, що інвертор розташований на адресі 0x01 в Modbus
4. Спробуйте збільшити `send_wait_time` в конфігу

## Ліцензія

MIT License

## Автор

Розроблено для независимого контролю ANENJI інвертора
