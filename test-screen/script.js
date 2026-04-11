const screenColorName = document.querySelector("#screen-color-name");
const screenGridState = document.querySelector("#screen-grid-state");
const screenFullscreenState = document.querySelector("#screen-fullscreen-state");
const screenPrev = document.querySelector("#screen-prev");
const screenNext = document.querySelector("#screen-next");
const screenAuto = document.querySelector("#screen-auto");
const screenGrid = document.querySelector("#screen-grid");
const screenFullscreen = document.querySelector("#screen-fullscreen");
const screenStatus = document.querySelector("#screen-status");
const screenPalette = document.querySelector("#screen-palette");
const screenLog = document.querySelector("#screen-log");
const screenStage = document.querySelector("#screen-stage");
const screenStageTitle = document.querySelector("#screen-stage-title");
const screenStageCaption = document.querySelector("#screen-stage-caption");

const screenPatterns = [
  {
    name: "Putih",
    color: "#ffffff",
    darkText: true,
    caption: "Gunakan warna putih untuk mencari pixel yang tampak gelap, kotor, atau redup.",
  },
  {
    name: "Hitam",
    color: "#05070a",
    darkText: false,
    caption: "Gunakan warna hitam untuk mengecek backlight bleed, glow, dan pixel yang menyala sendiri.",
  },
  {
    name: "Merah",
    color: "#ff3b30",
    darkText: false,
    caption: "Warna merah membantu mencari subpixel merah yang mati atau stuck.",
  },
  {
    name: "Hijau",
    color: "#29d56f",
    darkText: true,
    caption: "Warna hijau memudahkan pengecekan stuck pixel pada kanal hijau.",
  },
  {
    name: "Biru",
    color: "#2b6dff",
    darkText: false,
    caption: "Warna biru efektif untuk mengecek pixel terang yang tidak merata.",
  },
  {
    name: "Kuning",
    color: "#ffd166",
    darkText: true,
    caption: "Warna kuning membantu melihat titik kotor halus atau variasi tone panel.",
  },
  {
    name: "Magenta",
    color: "#ff4fd8",
    darkText: false,
    caption: "Warna magenta berguna untuk membedakan pixel stuck pada kombinasi merah dan biru.",
  },
  {
    name: "Cyan",
    color: "#46f2ff",
    darkText: true,
    caption: "Warna cyan membantu mencari panel non-uniformity di area terang.",
  },
  {
    name: "Abu-abu",
    color: "#9ea7b3",
    darkText: true,
    caption: "Mode abu-abu cocok untuk mengecek banding, tint, dan ketidakseimbangan backlight.",
  },
];

let currentScreenIndex = 0;
let autoCycleTimer = null;
let gridEnabled = false;

const setStatus = (message, state = "idle") => {
  screenStatus.textContent = message;
  screenStatus.dataset.state = state;
};

const addLog = (message) => {
  const item = document.createElement("li");
  item.textContent = message;
  screenLog.prepend(item);

  while (screenLog.children.length > 5) {
    screenLog.removeChild(screenLog.lastElementChild);
  }
};

const updateFullscreenState = () => {
  const isFullscreen = document.fullscreenElement === screenStage;
  screenFullscreenState.textContent = isFullscreen ? "Fullscreen" : "Window";
  screenFullscreen.textContent = isFullscreen ? "Exit Fullscreen" : "Fullscreen";
};

const renderPalette = () => {
  screenPalette.innerHTML = "";

  screenPatterns.forEach((pattern, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "screen-palette-button";
    button.dataset.index = String(index);
    button.innerHTML = `
      <span class="screen-palette-swatch" style="--swatch:${pattern.color}"></span>
      <strong>${pattern.name}</strong>
    `;

    if (index === currentScreenIndex) {
      button.classList.add("active");
    }

    screenPalette.appendChild(button);
  });
};

const applyScreenPattern = (index, options = {}) => {
  const { shouldLog = true } = options;
  currentScreenIndex = (index + screenPatterns.length) % screenPatterns.length;
  const pattern = screenPatterns[currentScreenIndex];

  screenStage.style.setProperty("--screen-color", pattern.color);
  screenStage.dataset.dark = pattern.darkText ? "false" : "true";
  screenStageTitle.textContent = pattern.name;
  screenStageCaption.textContent = pattern.caption;
  screenColorName.textContent = pattern.name;
  setStatus(`Mode ${pattern.name.toLowerCase()} aktif. Amati seluruh permukaan layar dengan teliti.`, "success");

  [...screenPalette.querySelectorAll(".screen-palette-button")].forEach((button) => {
    button.classList.toggle("active", Number(button.dataset.index) === currentScreenIndex);
  });

  if (shouldLog) {
    addLog(`Mode layar diganti ke ${pattern.name}.`);
  }
};

const stopAutoCycle = ({ silent = false } = {}) => {
  if (autoCycleTimer) {
    window.clearInterval(autoCycleTimer);
    autoCycleTimer = null;
  }

  screenAuto.textContent = "Auto Cycle";

  if (!silent) {
    setStatus("Auto cycle dihentikan. Anda bisa mengganti warna secara manual.", "idle");
    addLog("Auto cycle warna dihentikan.");
  }
};

const startAutoCycle = () => {
  stopAutoCycle({ silent: true });
  autoCycleTimer = window.setInterval(() => {
    applyScreenPattern(currentScreenIndex + 1, { shouldLog: false });
  }, 2500);
  screenAuto.textContent = "Stop Auto";
  setStatus("Auto cycle aktif. Warna akan berganti otomatis setiap beberapa detik.", "pending");
  addLog("Auto cycle warna dimulai.");
};

const toggleGrid = () => {
  gridEnabled = !gridEnabled;
  screenStage.classList.toggle("is-grid", gridEnabled);
  screenGridState.textContent = gridEnabled ? "On" : "Off";
  screenGrid.textContent = gridEnabled ? "Hide Grid" : "Grid Pixel";
  setStatus(gridEnabled ? "Grid pixel aktif untuk membantu melihat detail kecil." : "Grid pixel dimatikan.", "idle");
  addLog(gridEnabled ? "Grid pixel diaktifkan." : "Grid pixel dimatikan.");
};

const toggleFullscreen = async () => {
  try {
    if (document.fullscreenElement === screenStage) {
      await document.exitFullscreen();
    } else {
      await screenStage.requestFullscreen();
    }
  } catch (error) {
    setStatus("Browser menolak fullscreen untuk area tes layar ini.", "error");
    addLog(`Gagal mengubah fullscreen: ${error.name || "UnknownError"}`);
  }
};

screenPrev?.addEventListener("click", () => {
  applyScreenPattern(currentScreenIndex - 1);
});

screenNext?.addEventListener("click", () => {
  applyScreenPattern(currentScreenIndex + 1);
});

screenAuto?.addEventListener("click", () => {
  if (autoCycleTimer) {
    stopAutoCycle();
  } else {
    startAutoCycle();
  }
});

screenGrid?.addEventListener("click", toggleGrid);
screenFullscreen?.addEventListener("click", toggleFullscreen);

screenPalette?.addEventListener("click", (event) => {
  const button = event.target.closest(".screen-palette-button");
  if (!button) {
    return;
  }

  applyScreenPattern(Number(button.dataset.index));
});

screenStage?.addEventListener("dblclick", toggleFullscreen);

document.addEventListener("fullscreenchange", updateFullscreenState);

window.addEventListener("keydown", (event) => {
  if (event.key === "ArrowRight") {
    applyScreenPattern(currentScreenIndex + 1);
  } else if (event.key === "ArrowLeft") {
    applyScreenPattern(currentScreenIndex - 1);
  } else if (event.key.toLowerCase() === "g") {
    toggleGrid();
  }
});

window.addEventListener("beforeunload", () => {
  stopAutoCycle({ silent: true });
});

renderPalette();
applyScreenPattern(0, { shouldLog: false });
updateFullscreenState();
screenGridState.textContent = "Off";
