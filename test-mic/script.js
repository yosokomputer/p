const micSelect = document.querySelector("#mic-select");
const micStart = document.querySelector("#mic-start");
const micStop = document.querySelector("#mic-stop");
const micRefresh = document.querySelector("#mic-refresh");
const micRecord = document.querySelector("#mic-record");
const micPlayback = document.querySelector("#mic-playback");
const micStatus = document.querySelector("#mic-status");
const micPermission = document.querySelector("#mic-permission");
const micDevice = document.querySelector("#mic-device");
const micLevelLabel = document.querySelector("#mic-level-label");
const micStageText = document.querySelector("#mic-stage-text");
const micMeterFill = document.querySelector("#mic-meter-fill");
const micMeterBars = [...document.querySelectorAll(".mic-meter-bar")];
const micLabel = document.querySelector("#mic-label");
const micRate = document.querySelector("#mic-rate");
const micRecordState = document.querySelector("#mic-record-state");
const micLog = document.querySelector("#mic-log");
const micRecordedAudio = document.querySelector("#mic-recorded-audio");

let availableInputs = [];
let currentStream = null;
let audioContext = null;
let analyserNode = null;
let sourceNode = null;
let meterTimer = null;
let mediaRecorder = null;
let recordingTimeout = null;
let recordedUrl = "";

const setStatus = (message, state = "idle") => {
  micStatus.textContent = message;
  micStatus.dataset.state = state;
};

const addLog = (message) => {
  const item = document.createElement("li");
  item.textContent = message;
  micLog.prepend(item);

  while (micLog.children.length > 5) {
    micLog.removeChild(micLog.lastElementChild);
  }
};

const setMeterLevel = (level) => {
  const percent = Math.max(0, Math.min(100, Math.round(level)));
  micMeterFill.style.width = `${percent}%`;
  micLevelLabel.textContent = `${percent}%`;

  micMeterBars.forEach((bar, index) => {
    const threshold = ((index + 1) / micMeterBars.length) * 100;
    bar.classList.toggle("is-active", percent >= threshold);
  });
};

const stopMeter = () => {
  if (meterTimer) {
    window.clearInterval(meterTimer);
    meterTimer = null;
  }

  setMeterLevel(0);
};

const startMeter = () => {
  stopMeter();

  if (!analyserNode) {
    return;
  }

  const buffer = new Uint8Array(analyserNode.fftSize);

  meterTimer = window.setInterval(() => {
    if (!analyserNode) {
      return;
    }

    analyserNode.getByteTimeDomainData(buffer);

    let sum = 0;
    for (const value of buffer) {
      const normalized = (value - 128) / 128;
      sum += normalized * normalized;
    }

    const rms = Math.sqrt(sum / buffer.length);
    const level = Math.min(100, rms * 240);
    setMeterLevel(level);
  }, 80);
};

const revokeRecordedAudio = () => {
  if (recordedUrl) {
    URL.revokeObjectURL(recordedUrl);
    recordedUrl = "";
  }

  micRecordedAudio.removeAttribute("src");
  micRecordedAudio.classList.remove("is-ready");
  micPlayback.disabled = true;
};

const stopCurrentStream = ({ silent = false } = {}) => {
  if (recordingTimeout) {
    window.clearTimeout(recordingTimeout);
    recordingTimeout = null;
  }

  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
  }

  if (sourceNode) {
    sourceNode.disconnect();
    sourceNode = null;
  }

  if (analyserNode) {
    analyserNode.disconnect();
    analyserNode = null;
  }

  if (currentStream) {
    currentStream.getTracks().forEach((track) => track.stop());
    currentStream = null;
  }

  stopMeter();
  micStageText.textContent = "Mikrofon berhenti";
  micDevice.textContent = "Dihentikan";

  if (!silent) {
    setStatus("Tes mikrofon dihentikan. Klik `Izinkan Mic` untuk memulai lagi.", "idle");
    addLog("Tes mikrofon dihentikan.");
  }
};

const fillInputDevices = async () => {
  if (!navigator.mediaDevices?.enumerateDevices) {
    setStatus("Browser ini tidak mendukung enumerasi perangkat mikrofon.", "error");
    addLog("Enumerasi perangkat mikrofon tidak didukung.");
    return;
  }

  const devices = await navigator.mediaDevices.enumerateDevices();
  availableInputs = devices.filter((device) => device.kind === "audioinput");

  micSelect.innerHTML = "";

  if (!availableInputs.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Tidak ada mikrofon terdeteksi";
    micSelect.appendChild(option);
    micDevice.textContent = "Tidak ada";
    micLabel.textContent = "Tidak ada mikrofon";
    return;
  }

  availableInputs.forEach((device, index) => {
    const option = document.createElement("option");
    option.value = device.deviceId;
    option.textContent = device.label || `Mikrofon ${index + 1}`;
    micSelect.appendChild(option);
  });

  const firstDevice = availableInputs[0];
  micDevice.textContent = firstDevice.label || "Mikrofon terdeteksi";
  micLabel.textContent = firstDevice.label || "Mikrofon terdeteksi";
};

const startMicrophone = async (deviceId = "") => {
  if (!navigator.mediaDevices?.getUserMedia) {
    setStatus("Browser ini tidak mendukung akses mikrofon.", "error");
    micPermission.textContent = "Tidak didukung";
    addLog("getUserMedia untuk audio tidak tersedia.");
    return;
  }

  stopCurrentStream({ silent: true });

  setStatus("Meminta izin akses mikrofon. Silakan cek popup permission browser.", "pending");
  micPermission.textContent = "Meminta izin";
  micStageText.textContent = "Menunggu izin mikrofon";
  micRecordState.textContent = "Belum ada";

  try {
    const constraints = {
      audio: deviceId
        ? {
            deviceId: { exact: deviceId },
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          }
        : {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
      video: false,
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    currentStream = stream;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioContext = audioContext || new AudioContextClass();
      await audioContext.resume();
      sourceNode = audioContext.createMediaStreamSource(stream);
      analyserNode = audioContext.createAnalyser();
      analyserNode.fftSize = 512;
      sourceNode.connect(analyserNode);
      startMeter();
    }

    const [track] = stream.getAudioTracks();
    const settings = track?.getSettings?.() || {};
    const activeLabel = track?.label || "Mikrofon aktif";

    micPermission.textContent = "Diizinkan";
    micDevice.textContent = activeLabel;
    micLabel.textContent = activeLabel;
    micRate.textContent = settings.sampleRate ? `${settings.sampleRate} Hz` : "Default browser";
    micStageText.textContent = "Input mikrofon aktif";
    setStatus("Mikrofon aktif. Ucapkan sesuatu dan lihat level meter bergerak.", "success");
    addLog(`Mikrofon aktif: ${activeLabel}`);

    await fillInputDevices();

    if (settings.deviceId) {
      micSelect.value = settings.deviceId;
    }

    micDevice.textContent = activeLabel;
    micLabel.textContent = activeLabel;
  } catch (error) {
    micPermission.textContent = "Ditolak / gagal";

    let message = "Mikrofon tidak bisa diakses.";
    if (error.name === "NotAllowedError") {
      message = "Izin mikrofon ditolak. Silakan izinkan akses mic dari browser lalu coba lagi.";
    } else if (error.name === "NotFoundError") {
      message = "Tidak ada perangkat mikrofon yang ditemukan.";
    } else if (error.name === "NotReadableError") {
      message = "Mikrofon sedang dipakai aplikasi lain atau tidak bisa dibaca.";
    } else if (error.name === "OverconstrainedError") {
      message = "Perangkat mikrofon yang dipilih tidak tersedia. Coba refresh daftar mic.";
    }

    stopMeter();
    micStageText.textContent = "Mikrofon belum aktif";
    setStatus(message, "error");
    addLog(`Gagal mengakses mikrofon: ${error.name || "UnknownError"}`);
  }
};

const startRecording = () => {
  if (!currentStream) {
    setStatus("Aktifkan mikrofon dulu sebelum merekam.", "error");
    addLog("Rekaman dibatalkan karena mikrofon belum aktif.");
    return;
  }

  if (typeof MediaRecorder === "undefined") {
    setStatus("Browser ini belum mendukung rekaman audio dari halaman tester.", "error");
    micRecordState.textContent = "Tidak didukung";
    return;
  }

  revokeRecordedAudio();

  const chunks = [];
  mediaRecorder = new MediaRecorder(currentStream);
  micRecord.disabled = true;
  micRecordState.textContent = "Merekam...";
  setStatus("Rekaman 5 detik dimulai. Ucapkan sesuatu ke mikrofon Anda.", "pending");
  addLog("Rekaman mikrofon dimulai.");

  mediaRecorder.addEventListener("dataavailable", (event) => {
    if (event.data.size > 0) {
      chunks.push(event.data);
    }
  });

  mediaRecorder.addEventListener(
    "stop",
    () => {
      micRecord.disabled = false;

      if (!chunks.length) {
        micRecordState.textContent = "Kosong";
        setStatus("Rekaman selesai, tetapi browser tidak menghasilkan file audio.", "error");
        addLog("Rekaman selesai tanpa data audio.");
        return;
      }

      const blob = new Blob(chunks, { type: chunks[0].type || "audio/webm" });
      recordedUrl = URL.createObjectURL(blob);
      micRecordedAudio.src = recordedUrl;
      micRecordedAudio.classList.add("is-ready");
      micPlayback.disabled = false;
      micRecordState.textContent = "Siap diputar";
      setStatus("Rekaman selesai. Klik `Putar Rekaman` untuk mendengar hasilnya.", "success");
      addLog("Rekaman mikrofon selesai dan siap diputar.");
    },
    { once: true }
  );

  mediaRecorder.start();

  recordingTimeout = window.setTimeout(() => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    }
    recordingTimeout = null;
  }, 5000);
};

const playRecording = async () => {
  if (!micRecordedAudio.src) {
    setStatus("Belum ada rekaman. Jalankan `Rekam 5 Detik` terlebih dahulu.", "error");
    return;
  }

  try {
    await micRecordedAudio.play();
    setStatus("Rekaman diputar. Pastikan suara Anda terdengar jelas.", "success");
    addLog("Rekaman mikrofon diputar ulang.");
  } catch (error) {
    setStatus("Browser memblokir playback rekaman. Coba klik kontrol audio bawaan.", "error");
    addLog(`Gagal memutar rekaman: ${error.name || "UnknownError"}`);
  }
};

micStart?.addEventListener("click", () => {
  startMicrophone(micSelect.value);
});

micStop?.addEventListener("click", () => {
  stopCurrentStream();
  micPermission.textContent = "Dihentikan";
  micStageText.textContent = "Mikrofon berhenti";
});

micRefresh?.addEventListener("click", async () => {
  await fillInputDevices();
  setStatus("Daftar mikrofon diperbarui.", "idle");
  addLog("Daftar mikrofon diperbarui.");
});

micSelect?.addEventListener("change", () => {
  const selected = availableInputs.find((device) => device.deviceId === micSelect.value);
  if (selected) {
    micDevice.textContent = selected.label || "Mikrofon dipilih";
    micLabel.textContent = selected.label || "Mikrofon dipilih";
    setStatus("Mikrofon dipilih. Klik `Izinkan Mic` untuk memulai dengan perangkat ini.", "idle");
  }
});

micRecord?.addEventListener("click", startRecording);
micPlayback?.addEventListener("click", playRecording);

window.addEventListener("beforeunload", () => {
  stopCurrentStream({ silent: true });
  revokeRecordedAudio();

  if (audioContext && typeof audioContext.close === "function") {
    audioContext.close().catch(() => {});
  }
});

micPlayback.disabled = true;
fillInputDevices().catch(() => {
  setStatus("Gagal membaca daftar mikrofon awal. Browser mungkin membatasi akses sebelum permission diberikan.", "error");
  addLog("Gagal memuat daftar mikrofon awal.");
});
