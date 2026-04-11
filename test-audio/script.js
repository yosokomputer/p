const audioOutputSelect = document.querySelector("#audio-output-select");
const audioPlayStereo = document.querySelector("#audio-play-stereo");
const audioPlayLeft = document.querySelector("#audio-play-left");
const audioPlayRight = document.querySelector("#audio-play-right");
const audioStop = document.querySelector("#audio-stop");
const audioRefresh = document.querySelector("#audio-refresh");
const audioVolume = document.querySelector("#audio-volume");
const audioVolumeValue = document.querySelector("#audio-volume-value");
const audioStatus = document.querySelector("#audio-status");
const audioSupport = document.querySelector("#audio-support");
const audioDevice = document.querySelector("#audio-device");
const audioMode = document.querySelector("#audio-mode");
const audioStageLabel = document.querySelector("#audio-stage-label");
const audioPlaybackState = document.querySelector("#audio-playback-state");
const audioVolumeState = document.querySelector("#audio-volume-state");
const audioRoutingState = document.querySelector("#audio-routing-state");
const audioLog = document.querySelector("#audio-log");
const audioBars = [...document.querySelectorAll(".audio-bar")];

const AudioContextClass = window.AudioContext || window.webkitAudioContext;
const supportsAudioApi = Boolean(AudioContextClass);
const supportsSinkSelection = typeof HTMLMediaElement !== "undefined" && "setSinkId" in HTMLMediaElement.prototype;

let availableOutputs = [];
let audioContext = null;
let sinkAudio = null;
let mediaDestination = null;
let currentOscillator = null;
let currentGainNode = null;
let currentPanner = null;
let visualizerFrame = 0;
let visualizerTimer = null;
let currentMode = "";

const modeLabels = {
  stereo: "Stereo",
  left: "Kanal kiri",
  right: "Kanal kanan",
};

const setStatus = (message, state = "idle") => {
  audioStatus.textContent = message;
  audioStatus.dataset.state = state;
};

const addLog = (message) => {
  const item = document.createElement("li");
  item.textContent = message;
  audioLog.prepend(item);

  while (audioLog.children.length > 5) {
    audioLog.removeChild(audioLog.lastElementChild);
  }
};

const getSelectedOutputLabel = () => {
  const selected = availableOutputs.find((device) => device.deviceId === audioOutputSelect.value);
  return selected?.label || "Default browser";
};

const resetBars = () => {
  audioBars.forEach((bar, index) => {
    const height = 18 + ((index % 4) * 4);
    bar.style.height = `${height}%`;
    bar.classList.remove("is-active");
  });
};

const renderBars = () => {
  visualizerFrame += 1;

  audioBars.forEach((bar, index) => {
    const wave = Math.abs(Math.sin((visualizerFrame + index * 1.4) / 6));
    const channelBias =
      currentMode === "left"
        ? index < audioBars.length / 2
          ? 1
          : 0.35
        : currentMode === "right"
          ? index >= audioBars.length / 2
            ? 1
            : 0.35
          : 0.85;
    const height = 18 + Math.round(wave * 60 * channelBias);
    bar.style.height = `${height}%`;
    bar.classList.add("is-active");
  });
};

const startVisualizer = () => {
  stopVisualizer();
  visualizerFrame = 0;
  renderBars();
  visualizerTimer = window.setInterval(renderBars, 90);
};

const stopVisualizer = () => {
  if (visualizerTimer) {
    window.clearInterval(visualizerTimer);
    visualizerTimer = null;
  }

  resetBars();
};

const updateVolumeLabel = () => {
  const percentage = `${Math.round(Number(audioVolume.value) * 100)}%`;
  audioVolumeValue.textContent = percentage;
  audioVolumeState.textContent = percentage;
};

const ensureAudioGraph = () => {
  if (!supportsAudioApi) {
    audioSupport.textContent = "Tidak didukung";
    setStatus("Browser ini tidak mendukung Web Audio API untuk tes speaker.", "error");
    return false;
  }

  if (audioContext) {
    return true;
  }

  audioContext = new AudioContextClass();

  if (supportsSinkSelection) {
    sinkAudio = new Audio();
    sinkAudio.autoplay = false;
    sinkAudio.playsInline = true;

    mediaDestination = audioContext.createMediaStreamDestination();
    sinkAudio.srcObject = mediaDestination.stream;
  }

  return true;
};

const stopPlayback = ({ silent = false } = {}) => {
  if (currentOscillator) {
    try {
      currentOscillator.stop();
    } catch (error) {
      // Ignore invalid state when the oscillator was already stopped.
    }
    currentOscillator.disconnect();
    currentOscillator = null;
  }

  if (currentPanner) {
    currentPanner.disconnect();
    currentPanner = null;
  }

  if (currentGainNode) {
    currentGainNode.disconnect();
    currentGainNode = null;
  }

  if (sinkAudio) {
    sinkAudio.pause();
  }

  currentMode = "";
  audioMode.textContent = "Belum diputar";
  audioPlaybackState.textContent = "Stopped";
  audioStageLabel.textContent = "Playback berhenti";
  stopVisualizer();

  if (!silent) {
    setStatus("Playback audio dihentikan. Pilih mode play untuk mencoba lagi.", "idle");
    addLog("Playback audio dihentikan.");
  }
};

const applySinkSelection = async () => {
  if (!sinkAudio || !supportsSinkSelection) {
    return;
  }

  const sinkId = audioOutputSelect.value || "default";
  await sinkAudio.setSinkId(sinkId);
};

const startPlayback = async (mode) => {
  if (!ensureAudioGraph()) {
    return;
  }

  stopPlayback({ silent: true });

  try {
    await audioContext.resume();

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    const canPan = typeof audioContext.createStereoPanner === "function";

    oscillator.type = mode === "stereo" ? "triangle" : "sine";
    oscillator.frequency.value = mode === "stereo" ? 440 : 520;
    gainNode.gain.value = Number(audioVolume.value);

    oscillator.connect(gainNode);

    if (canPan) {
      currentPanner = audioContext.createStereoPanner();
      currentPanner.pan.value = mode === "left" ? -1 : mode === "right" ? 1 : 0;
      gainNode.connect(currentPanner);

      if (mediaDestination) {
        currentPanner.connect(mediaDestination);
      } else {
        currentPanner.connect(audioContext.destination);
      }
    } else if (mediaDestination) {
      gainNode.connect(mediaDestination);
    } else {
      gainNode.connect(audioContext.destination);
    }

    currentOscillator = oscillator;
    currentGainNode = gainNode;
    currentMode = mode;

    oscillator.start();

    if (supportsSinkSelection && sinkAudio) {
      await applySinkSelection();
      await sinkAudio.play();
    }

    const outputLabel = getSelectedOutputLabel();
    const modeLabel = modeLabels[mode] || "Stereo";

    audioSupport.textContent = supportsSinkSelection ? "Lengkap" : "Dasar";
    audioDevice.textContent = outputLabel;
    audioMode.textContent = modeLabel;
    audioPlaybackState.textContent = "Playing";
    audioRoutingState.textContent = outputLabel;
    audioStageLabel.textContent = `Mode aktif: ${modeLabel}`;
    setStatus(`Nada uji ${modeLabel.toLowerCase()} sedang diputar ke ${outputLabel}.`, "success");
    addLog(`Playback ${modeLabel} dimulai ke ${outputLabel}.`);
    startVisualizer();
  } catch (error) {
    stopPlayback({ silent: true });

    let message = "Audio tidak bisa diputar dari browser ini.";
    if (error.name === "NotAllowedError") {
      message = "Browser memblokir playback audio. Coba klik ulang tombol play atau izinkan audio.";
    } else if (error.name === "SecurityError") {
      message = "Pemilihan output audio dibatasi oleh konteks browser saat ini.";
    }

    audioPlaybackState.textContent = "Gagal";
    setStatus(message, "error");
    addLog(`Gagal memutar audio: ${error.name || "UnknownError"}`);
  }
};

const fillOutputDevices = async () => {
  if (!navigator.mediaDevices?.enumerateDevices) {
    audioSupport.textContent = supportsAudioApi ? "Dasar" : "Tidak didukung";
    audioOutputSelect.innerHTML = '<option value="default">Enumerasi device tidak tersedia</option>';
    audioOutputSelect.disabled = true;
    audioRoutingState.textContent = "Default browser";
    return;
  }

  const devices = await navigator.mediaDevices.enumerateDevices();
  availableOutputs = devices.filter(
    (device) => device.kind === "audiooutput" && device.deviceId !== "communications"
  );

  audioOutputSelect.innerHTML = "";

  const defaultOption = document.createElement("option");
  defaultOption.value = "default";
  defaultOption.textContent = "Default browser";
  audioOutputSelect.appendChild(defaultOption);

  availableOutputs.forEach((device, index) => {
    const option = document.createElement("option");
    option.value = device.deviceId;
    option.textContent = device.label || `Output ${index + 1}`;
    audioOutputSelect.appendChild(option);
  });

  audioOutputSelect.disabled = !supportsSinkSelection;
  audioSupport.textContent = supportsAudioApi ? (supportsSinkSelection ? "Lengkap" : "Dasar") : "Tidak didukung";
  audioRoutingState.textContent = "Default browser";
};

audioPlayStereo?.addEventListener("click", () => {
  startPlayback("stereo");
});

audioPlayLeft?.addEventListener("click", () => {
  startPlayback("left");
});

audioPlayRight?.addEventListener("click", () => {
  startPlayback("right");
});

audioStop?.addEventListener("click", () => {
  stopPlayback();
});

audioRefresh?.addEventListener("click", async () => {
  await fillOutputDevices();
  setStatus("Daftar output audio diperbarui.", "idle");
  addLog("Daftar output audio diperbarui.");
});

audioOutputSelect?.addEventListener("change", async () => {
  const outputLabel = getSelectedOutputLabel();
  audioDevice.textContent = outputLabel;
  audioRoutingState.textContent = outputLabel;

  if (supportsSinkSelection && sinkAudio) {
    try {
      await applySinkSelection();
      setStatus(`Output audio dipilih: ${outputLabel}. Klik play untuk menguji perangkat ini.`, "idle");
    } catch (error) {
      setStatus("Browser gagal memindahkan output audio. Gunakan output default atau coba browser lain.", "error");
      addLog(`Gagal memilih output audio: ${error.name || "UnknownError"}`);
    }
  } else {
    setStatus(`Output terlihat sebagai ${outputLabel}, tetapi browser ini memakai output default.`, "idle");
  }
});

audioVolume?.addEventListener("input", () => {
  updateVolumeLabel();

  if (currentGainNode) {
    currentGainNode.gain.value = Number(audioVolume.value);
  }
});

window.addEventListener("beforeunload", () => {
  stopPlayback({ silent: true });

  if (audioContext && typeof audioContext.close === "function") {
    audioContext.close().catch(() => {});
  }
});

updateVolumeLabel();
resetBars();
fillOutputDevices().catch(() => {
  audioSupport.textContent = supportsAudioApi ? "Dasar" : "Tidak didukung";
  setStatus("Gagal membaca output audio dari browser. Tes dasar masih bisa memakai output default.", "error");
  addLog("Gagal memuat daftar output audio awal.");
});
