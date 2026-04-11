const speedPing = document.querySelector("#speed-ping");
const speedDownload = document.querySelector("#speed-download");
const speedUpload = document.querySelector("#speed-upload");
const speedProfile = document.querySelector("#speed-profile");
const speedStart = document.querySelector("#speed-start");
const speedStop = document.querySelector("#speed-stop");
const speedStatus = document.querySelector("#speed-status");
const speedPhase = document.querySelector("#speed-phase");
const speedProgressText = document.querySelector("#speed-progress-text");
const speedProgressFill = document.querySelector("#speed-progress-fill");
const speedConnectionState = document.querySelector("#speed-connection-state");
const speedProfileState = document.querySelector("#speed-profile-state");
const speedServerState = document.querySelector("#speed-server-state");
const speedLog = document.querySelector("#speed-log");

const speedProfiles = {
  quick: {
    label: "Cepat",
    downloadBytes: 6_000_000,
    uploadBytes: 1_500_000,
  },
  standard: {
    label: "Standar",
    downloadBytes: 15_000_000,
    uploadBytes: 4_000_000,
  },
  heavy: {
    label: "Berat",
    downloadBytes: 30_000_000,
    uploadBytes: 8_000_000,
  },
};

let speedController = null;
let speedXhr = null;
let speedRunning = false;

const setStatus = (message, state = "idle") => {
  speedStatus.textContent = message;
  speedStatus.dataset.state = state;
};

const addLog = (message) => {
  const item = document.createElement("li");
  item.textContent = message;
  speedLog.prepend(item);

  while (speedLog.children.length > 5) {
    speedLog.removeChild(speedLog.lastElementChild);
  }
};

const formatSpeed = (value) => {
  if (!Number.isFinite(value) || value <= 0) {
    return "-";
  }

  return value >= 100 ? `${value.toFixed(0)} Mbps` : `${value.toFixed(1)} Mbps`;
};

const formatPing = (value) => {
  if (!Number.isFinite(value) || value <= 0) {
    return "-";
  }

  return `${value.toFixed(0)} ms`;
};

const setProgress = (percent, phase, detail) => {
  speedPhase.textContent = phase;
  speedProgressText.textContent = detail;
  speedProgressFill.style.width = `${Math.max(0, Math.min(100, percent))}%`;
};

const updateConnectionState = () => {
  if (!navigator.onLine) {
    speedConnectionState.textContent = "Offline";
    return;
  }

  const connection = navigator.connection || navigator.webkitConnection || navigator.mozConnection;
  if (!connection) {
    speedConnectionState.textContent = "Online";
    return;
  }

  const parts = [];
  if (connection.effectiveType) {
    parts.push(connection.effectiveType.toUpperCase());
  }
  if (Number.isFinite(connection.downlink)) {
    parts.push(`hint ${connection.downlink} Mbps`);
  }
  if (Number.isFinite(connection.rtt)) {
    parts.push(`RTT ${connection.rtt} ms`);
  }

  speedConnectionState.textContent = parts.join(" • ") || "Online";
};

const stopRunningTest = ({ silent = false } = {}) => {
  if (speedController) {
    speedController.abort();
    speedController = null;
  }

  if (speedXhr) {
    speedXhr.abort();
    speedXhr = null;
  }

  speedRunning = false;
  speedStart.disabled = false;
  speedStop.disabled = true;

  if (!silent) {
    setStatus("Speedtest dihentikan.", "idle");
    addLog("Speedtest dihentikan manual.");
  }
};

const measurePing = async (signal) => {
  const samples = [];

  for (let index = 0; index < 3; index += 1) {
    const startedAt = performance.now();
    await fetch(`https://speed.cloudflare.com/__down?bytes=1000&ts=${Date.now()}-${index}`, {
      method: "HEAD",
      cache: "no-store",
      mode: "cors",
      signal,
    });
    const elapsed = performance.now() - startedAt;
    samples.push(elapsed);
    setProgress(((index + 1) / 3) * 20, "Tes ping", `Sample ${index + 1}/3 • ${formatPing(elapsed)}`);
  }

  return samples.reduce((total, value) => total + value, 0) / samples.length;
};

const measureDownload = async (profile, signal) => {
  const url = `https://speed.cloudflare.com/__down?bytes=${profile.downloadBytes}&ts=${Date.now()}`;
  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
    mode: "cors",
    signal,
  });

  if (!response.ok) {
    throw new Error("Download request gagal.");
  }

  const startedAt = performance.now();
  let loadedBytes = 0;

  if (response.body?.getReader) {
    const reader = response.body.getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      loadedBytes += value.byteLength;
      const elapsedSeconds = Math.max((performance.now() - startedAt) / 1000, 0.001);
      const liveSpeed = (loadedBytes * 8) / elapsedSeconds / 1_000_000;
      const progress = 20 + (loadedBytes / profile.downloadBytes) * 45;

      setProgress(progress, "Tes download", `${formatSpeed(liveSpeed)} • ${Math.round((loadedBytes / profile.downloadBytes) * 100)}%`);
    }
  } else {
    const buffer = await response.arrayBuffer();
    loadedBytes = buffer.byteLength;
  }

  const totalSeconds = Math.max((performance.now() - startedAt) / 1000, 0.001);
  return (loadedBytes * 8) / totalSeconds / 1_000_000;
};

const measureUpload = (profile, signal) =>
  new Promise((resolve, reject) => {
    const payload = new Uint8Array(profile.uploadBytes);
    const xhr = new XMLHttpRequest();
    speedXhr = xhr;

    const abortHandler = () => {
      xhr.abort();
    };

    signal.addEventListener("abort", abortHandler, { once: true });

    const startedAt = performance.now();

    xhr.open("POST", `https://speed.cloudflare.com/__up?ts=${Date.now()}`);
    xhr.setRequestHeader("Content-Type", "application/octet-stream");

    xhr.upload.onprogress = (event) => {
      const uploadedBytes = event.loaded || 0;
      const elapsedSeconds = Math.max((performance.now() - startedAt) / 1000, 0.001);
      const liveSpeed = (uploadedBytes * 8) / elapsedSeconds / 1_000_000;
      const progress = 65 + (uploadedBytes / profile.uploadBytes) * 35;

      setProgress(progress, "Tes upload", `${formatSpeed(liveSpeed)} • ${Math.round((uploadedBytes / profile.uploadBytes) * 100)}%`);
    };

    xhr.onload = () => {
      signal.removeEventListener("abort", abortHandler);
      speedXhr = null;

      if (xhr.status < 200 || xhr.status >= 400) {
        reject(new Error("Upload request gagal."));
        return;
      }

      const totalSeconds = Math.max((performance.now() - startedAt) / 1000, 0.001);
      resolve((profile.uploadBytes * 8) / totalSeconds / 1_000_000);
    };

    xhr.onerror = () => {
      signal.removeEventListener("abort", abortHandler);
      speedXhr = null;
      reject(new Error("Upload request error."));
    };

    xhr.onabort = () => {
      signal.removeEventListener("abort", abortHandler);
      speedXhr = null;
      reject(new DOMException("Upload dibatalkan.", "AbortError"));
    };

    xhr.send(payload);
  });

const runSpeedTest = async () => {
  if (speedRunning) {
    return;
  }

  if (!navigator.onLine) {
    setStatus("Browser sedang offline. Sambungkan internet dulu untuk menjalankan speedtest.", "error");
    updateConnectionState();
    return;
  }

  const profile = speedProfiles[speedProfile.value] || speedProfiles.standard;
  speedProfileState.textContent = profile.label;
  speedServerState.textContent = "Cloudflare";
  speedController = new AbortController();
  speedRunning = true;
  speedStart.disabled = true;
  speedStop.disabled = false;
  speedPing.textContent = "-";
  speedDownload.textContent = "-";
  speedUpload.textContent = "-";

  try {
    setStatus("Speedtest dimulai. Mengukur ping terlebih dulu.", "pending");
    addLog(`Speedtest dimulai dengan profil ${profile.label}.`);

    const pingValue = await measurePing(speedController.signal);
    speedPing.textContent = formatPing(pingValue);
    addLog(`Ping rata-rata: ${formatPing(pingValue)}.`);

    setStatus("Tes download berjalan. Jangan jalankan trafik besar lain dulu.", "pending");
    const downloadValue = await measureDownload(profile, speedController.signal);
    speedDownload.textContent = formatSpeed(downloadValue);
    addLog(`Download selesai: ${formatSpeed(downloadValue)}.`);

    setStatus("Tes upload berjalan. Tunggu hingga progres mencapai 100%.", "pending");
    const uploadValue = await measureUpload(profile, speedController.signal);
    speedUpload.textContent = formatSpeed(uploadValue);
    addLog(`Upload selesai: ${formatSpeed(uploadValue)}.`);

    setProgress(100, "Selesai", `Ping ${formatPing(pingValue)} • Down ${formatSpeed(downloadValue)} • Up ${formatSpeed(uploadValue)}`);
    setStatus("Speedtest selesai. Anda bisa ulangi untuk membandingkan hasilnya.", "success");
  } catch (error) {
    if (error.name === "AbortError") {
      setStatus("Speedtest dibatalkan.", "idle");
      addLog("Speedtest dibatalkan sebelum selesai.");
    } else {
      setStatus("Speedtest gagal dijalankan. Cek koneksi, firewall, atau browser Anda.", "error");
      addLog(`Speedtest gagal: ${error.message}`);
    }
  } finally {
    speedRunning = false;
    speedStart.disabled = false;
    speedStop.disabled = true;
    speedController = null;
    speedXhr = null;
    updateConnectionState();
  }
};

speedStart?.addEventListener("click", runSpeedTest);
speedStop?.addEventListener("click", () => {
  if (speedRunning) {
    stopRunningTest();
  }
});

speedProfile?.addEventListener("change", () => {
  const profile = speedProfiles[speedProfile.value] || speedProfiles.standard;
  speedProfileState.textContent = profile.label;
});

window.addEventListener("online", updateConnectionState);
window.addEventListener("offline", updateConnectionState);

const browserConnection = navigator.connection || navigator.webkitConnection || navigator.mozConnection;
browserConnection?.addEventListener?.("change", updateConnectionState);

window.addEventListener("beforeunload", () => {
  stopRunningTest({ silent: true });
});

speedStop.disabled = true;
updateConnectionState();
speedProfileState.textContent = speedProfiles[speedProfile.value]?.label || "Standar";
speedServerState.textContent = "Cloudflare";
setProgress(0, "Menunggu", "Belum ada pengujian aktif.");
