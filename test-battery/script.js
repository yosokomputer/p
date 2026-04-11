const batterySupport = document.querySelector("#battery-support");
const batteryLevel = document.querySelector("#battery-level");
const batteryState = document.querySelector("#battery-state");
const batteryRefresh = document.querySelector("#battery-refresh");
const batteryMonitor = document.querySelector("#battery-monitor");
const batteryStop = document.querySelector("#battery-stop");
const batteryStatus = document.querySelector("#battery-status");
const batteryChargeTime = document.querySelector("#battery-charge-time");
const batteryDischargeTime = document.querySelector("#battery-discharge-time");
const batterySessionTime = document.querySelector("#battery-session-time");
const batteryDelta = document.querySelector("#battery-delta");
const batteryHealthNote = document.querySelector("#battery-health-note");
const batteryLog = document.querySelector("#battery-log");

let batteryManager = null;
let batteryMonitorTimer = null;
let batteryMonitorStartedAt = 0;
let batteryMonitorStartLevel = null;

const setStatus = (message, state = "idle") => {
  batteryStatus.textContent = message;
  batteryStatus.dataset.state = state;
};

const addLog = (message) => {
  const item = document.createElement("li");
  item.textContent = message;
  batteryLog.prepend(item);

  while (batteryLog.children.length > 5) {
    batteryLog.removeChild(batteryLog.lastElementChild);
  }
};

const formatBatteryTime = (seconds) => {
  if (!Number.isFinite(seconds) || seconds === Infinity || seconds < 0) {
    return "Tidak diketahui";
  }

  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0) {
    return `${minutes} menit`;
  }

  return `${hours} jam ${minutes} menit`;
};

const formatClock = (milliseconds) => {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
};

const updateMonitorSnapshot = () => {
  if (!batteryMonitorStartedAt || batteryMonitorStartLevel === null || !batteryManager) {
    batterySessionTime.textContent = "Belum aktif";
    batteryDelta.textContent = "-";
    return;
  }

  const elapsed = Date.now() - batteryMonitorStartedAt;
  const delta = Math.round((batteryManager.level - batteryMonitorStartLevel) * 100);

  batterySessionTime.textContent = formatClock(elapsed);
  batteryDelta.textContent = delta === 0 ? "0%" : `${delta > 0 ? "+" : ""}${delta}%`;
};

const updateBatteryView = () => {
  if (!batteryManager) {
    batterySupport.textContent = "Tidak tersedia";
    batteryLevel.textContent = "-";
    batteryState.textContent = "-";
    batteryChargeTime.textContent = "-";
    batteryDischargeTime.textContent = "-";
    batteryHealthNote.textContent = "Perlu aplikasi sistem";
    return;
  }

  const levelPercent = `${Math.round(batteryManager.level * 100)}%`;
  const chargingState = batteryManager.charging ? "Charging" : "Discharging";

  batterySupport.textContent = "Tersedia";
  batteryLevel.textContent = levelPercent;
  batteryState.textContent = chargingState;
  batteryChargeTime.textContent = batteryManager.charging ? formatBatteryTime(batteryManager.chargingTime) : "-";
  batteryDischargeTime.textContent = batteryManager.charging ? "-" : formatBatteryTime(batteryManager.dischargingTime);
  batteryHealthNote.textContent = "Wear level fisik tidak tersedia dari browser";

  updateMonitorSnapshot();
};

const stopBatteryMonitor = ({ silent = false } = {}) => {
  if (batteryMonitorTimer) {
    window.clearInterval(batteryMonitorTimer);
    batteryMonitorTimer = null;
  }

  if (!silent) {
    setStatus("Monitoring baterai dihentikan.", "idle");
    addLog("Monitoring baterai dihentikan.");
  }
};

const startBatteryMonitor = () => {
  if (!batteryManager) {
    setStatus("Browser ini tidak menyediakan Battery Status API.", "error");
    return;
  }

  stopBatteryMonitor({ silent: true });

  batteryMonitorStartedAt = Date.now();
  batteryMonitorStartLevel = batteryManager.level;
  batteryMonitorTimer = window.setInterval(updateMonitorSnapshot, 1000);
  updateMonitorSnapshot();

  setStatus("Monitoring baterai berjalan. Biarkan tool ini aktif untuk melihat perubahan level.", "pending");
  addLog("Monitoring baterai dimulai.");
};

const refreshBatteryData = () => {
  updateBatteryView();

  if (!batteryManager) {
    setStatus("Battery Status API tidak tersedia di browser ini.", "error");
    return;
  }

  setStatus("Data baterai berhasil diperbarui.", "success");
  addLog("Status baterai diperbarui.");
};

const attachBatteryListeners = () => {
  if (!batteryManager || batteryManager._listenersBound) {
    return;
  }

  const sync = () => {
    updateBatteryView();
  };

  batteryManager.addEventListener("chargingchange", () => {
    sync();
    addLog(`Status charging berubah menjadi ${batteryManager.charging ? "charging" : "discharging"}.`);
  });

  batteryManager.addEventListener("levelchange", () => {
    sync();
    addLog(`Level baterai berubah ke ${Math.round(batteryManager.level * 100)}%.`);
  });

  batteryManager.addEventListener("chargingtimechange", sync);
  batteryManager.addEventListener("dischargingtimechange", sync);
  batteryManager._listenersBound = true;
};

const initBatteryTool = async () => {
  if (!("getBattery" in navigator)) {
    batterySupport.textContent = "Tidak tersedia";
    batteryHealthNote.textContent = "Perlu aplikasi sistem";
    setStatus("Browser ini tidak mendukung Battery Status API. Tool hanya bisa menampilkan panduan umum.", "error");
    addLog("Battery Status API tidak tersedia.");
    return;
  }

  try {
    batteryManager = await navigator.getBattery();
    attachBatteryListeners();
    updateBatteryView();
    setStatus("Status baterai berhasil dibaca dari browser.", "success");
    addLog("Battery Status API berhasil diinisialisasi.");
  } catch (error) {
    batterySupport.textContent = "Gagal";
    batteryHealthNote.textContent = "Perlu aplikasi sistem";
    setStatus("Gagal membaca status baterai dari browser.", "error");
    addLog(`Gagal membaca baterai: ${error.name || "UnknownError"}`);
  }
};

batteryRefresh?.addEventListener("click", refreshBatteryData);
batteryMonitor?.addEventListener("click", startBatteryMonitor);
batteryStop?.addEventListener("click", () => {
  stopBatteryMonitor();
});

window.addEventListener("beforeunload", () => {
  stopBatteryMonitor({ silent: true });
});

batteryStop.disabled = false;
initBatteryTool();
