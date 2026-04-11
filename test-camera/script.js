const cameraSelect = document.querySelector("#camera-select");
const cameraStart = document.querySelector("#camera-start");
const cameraStop = document.querySelector("#camera-stop");
const cameraRefresh = document.querySelector("#camera-refresh");
const cameraVideo = document.querySelector("#camera-video");
const cameraOverlay = document.querySelector("#camera-overlay");
const cameraStatus = document.querySelector("#camera-status");
const cameraPermission = document.querySelector("#camera-permission");
const cameraDevice = document.querySelector("#camera-device");
const cameraResolution = document.querySelector("#camera-resolution");
const cameraLabel = document.querySelector("#camera-label");
const cameraSize = document.querySelector("#camera-size");
const cameraStreamState = document.querySelector("#camera-stream-state");
const cameraLog = document.querySelector("#camera-log");

let currentStream = null;
let availableDevices = [];

const setStatus = (message, state = "idle") => {
  cameraStatus.textContent = message;
  cameraStatus.dataset.state = state;
};

const addLog = (message) => {
  const item = document.createElement("li");
  item.textContent = message;
  cameraLog.prepend(item);

  while (cameraLog.children.length > 5) {
    cameraLog.removeChild(cameraLog.lastElementChild);
  }
};

const setOverlay = (title, description, hidden = false) => {
  if (hidden) {
    cameraOverlay.classList.add("is-hidden");
    return;
  }

  cameraOverlay.classList.remove("is-hidden");
  cameraOverlay.innerHTML = `
    <strong>${title}</strong>
    <span>${description}</span>
  `;
};

const stopCurrentStream = () => {
  if (!currentStream) {
    return;
  }

  currentStream.getTracks().forEach((track) => track.stop());
  currentStream = null;
  cameraVideo.srcObject = null;
  cameraStreamState.textContent = "Stopped";
};

const updateVideoInfo = () => {
  const width = cameraVideo.videoWidth;
  const height = cameraVideo.videoHeight;

  if (width && height) {
    const resolutionText = `${width} x ${height}`;
    cameraResolution.textContent = resolutionText;
    cameraSize.textContent = resolutionText;
  } else {
    cameraResolution.textContent = "-";
    cameraSize.textContent = "-";
  }
};

const fillDeviceSelect = async () => {
  if (!navigator.mediaDevices?.enumerateDevices) {
    setStatus("Browser ini tidak mendukung enumerasi perangkat kamera.", "error");
    addLog("Enumerasi kamera tidak didukung browser.");
    return;
  }

  const devices = await navigator.mediaDevices.enumerateDevices();
  availableDevices = devices.filter((device) => device.kind === "videoinput");

  cameraSelect.innerHTML = "";

  if (!availableDevices.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Tidak ada kamera terdeteksi";
    cameraSelect.appendChild(option);
    cameraDevice.textContent = "Tidak ada";
    cameraLabel.textContent = "Tidak ada kamera";
    return;
  }

  availableDevices.forEach((device, index) => {
    const option = document.createElement("option");
    option.value = device.deviceId;
    option.textContent = device.label || `Kamera ${index + 1}`;
    cameraSelect.appendChild(option);
  });

  const firstDevice = availableDevices[0];
  cameraDevice.textContent = firstDevice.label || "Kamera terdeteksi";
  cameraLabel.textContent = firstDevice.label || "Kamera terdeteksi";
};

const startCamera = async (deviceId = "") => {
  if (!navigator.mediaDevices?.getUserMedia) {
    setStatus("Browser ini tidak mendukung akses kamera.", "error");
    cameraPermission.textContent = "Tidak didukung";
    addLog("getUserMedia tidak tersedia.");
    return;
  }

  stopCurrentStream();

  setStatus("Meminta izin akses kamera. Silakan cek popup permission browser.", "pending");
  cameraPermission.textContent = "Meminta izin";
  cameraStreamState.textContent = "Memulai";
  setOverlay("Meminta izin kamera", "Silakan izinkan akses webcam di browser untuk melanjutkan.");

  try {
    const constraints = {
      video: deviceId ? { deviceId: { exact: deviceId } } : true,
      audio: false,
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    currentStream = stream;
    cameraVideo.srcObject = stream;

    const [track] = stream.getVideoTracks();
    const settings = track.getSettings();
    const activeLabel = track.label || "Kamera aktif";

    cameraPermission.textContent = "Diizinkan";
    cameraDevice.textContent = activeLabel;
    cameraLabel.textContent = activeLabel;
    cameraStreamState.textContent = "Streaming";
    setStatus("Kamera aktif dan preview sedang berjalan.", "success");
    setOverlay("", "", true);
    addLog(`Kamera aktif: ${activeLabel}`);

    if (settings.width && settings.height) {
      const resolutionText = `${settings.width} x ${settings.height}`;
      cameraResolution.textContent = resolutionText;
      cameraSize.textContent = resolutionText;
    }

    await fillDeviceSelect();

    if (settings.deviceId) {
      cameraSelect.value = settings.deviceId;
    }
  } catch (error) {
    cameraPermission.textContent = "Ditolak / gagal";
    cameraStreamState.textContent = "Gagal";

    let message = "Kamera tidak bisa diakses.";
    if (error.name === "NotAllowedError") {
      message = "Izin kamera ditolak. Silakan izinkan akses webcam dari browser lalu coba lagi.";
    } else if (error.name === "NotFoundError") {
      message = "Tidak ada perangkat kamera yang ditemukan.";
    } else if (error.name === "NotReadableError") {
      message = "Kamera sedang dipakai aplikasi lain atau tidak bisa dibaca.";
    } else if (error.name === "OverconstrainedError") {
      message = "Perangkat kamera yang dipilih tidak tersedia. Coba refresh daftar kamera.";
    }

    setStatus(message, "error");
    setOverlay("Kamera belum aktif", message);
    addLog(`Gagal mengakses kamera: ${error.name}`);
  }
};

cameraVideo.addEventListener("loadedmetadata", updateVideoInfo);

cameraStart?.addEventListener("click", () => {
  startCamera(cameraSelect.value);
});

cameraStop?.addEventListener("click", () => {
  stopCurrentStream();
  cameraPermission.textContent = "Dihentikan";
  cameraResolution.textContent = "-";
  cameraSize.textContent = "-";
  cameraStreamState.textContent = "Stopped";
  setStatus("Preview kamera dihentikan. Klik `Izinkan Kamera` untuk memulai lagi.", "idle");
  setOverlay("Preview dihentikan", "Klik tombol izinkan kamera untuk menjalankan kembali tes webcam.");
  addLog("Preview kamera dihentikan.");
});

cameraRefresh?.addEventListener("click", async () => {
  await fillDeviceSelect();
  setStatus("Daftar perangkat kamera diperbarui.", "idle");
  addLog("Daftar kamera diperbarui.");
});

cameraSelect?.addEventListener("change", () => {
  const selected = availableDevices.find((device) => device.deviceId === cameraSelect.value);
  if (selected) {
    cameraDevice.textContent = selected.label || "Kamera dipilih";
    cameraLabel.textContent = selected.label || "Kamera dipilih";
    setStatus("Kamera dipilih. Klik `Izinkan Kamera` untuk memulai dengan perangkat ini.", "idle");
  }
});

window.addEventListener("beforeunload", stopCurrentStream);

fillDeviceSelect().catch(() => {
  setStatus("Gagal membaca daftar kamera. Browser mungkin membatasi akses sebelum permission diberikan.", "error");
  addLog("Gagal memuat daftar kamera awal.");
});
