const cpuCoreCount = document.querySelector("#cpu-core-count");
const cpuWorkerCount = document.querySelector("#cpu-worker-count");
const cpuElapsed = document.querySelector("#cpu-elapsed");
const cpuWorkers = document.querySelector("#cpu-workers");
const cpuWorkersLabel = document.querySelector("#cpu-workers-label");
const cpuIntensity = document.querySelector("#cpu-intensity");
const cpuIntensityLabel = document.querySelector("#cpu-intensity-label");
const cpuStart = document.querySelector("#cpu-start");
const cpuStop = document.querySelector("#cpu-stop");
const cpuStatus = document.querySelector("#cpu-status");
const cpuOpsRate = document.querySelector("#cpu-ops-rate");
const cpuTotalOps = document.querySelector("#cpu-total-ops");
const cpuUiLag = document.querySelector("#cpu-ui-lag");
const cpuWorkerGrid = document.querySelector("#cpu-worker-grid");
const cpuLog = document.querySelector("#cpu-log");

const logicalCores = Math.max(1, navigator.hardwareConcurrency || 4);

let cpuWorkersRunning = [];
let cpuWorkerStates = [];
let cpuBlobUrl = "";
let cpuStartedAt = 0;
let cpuTotalOperationsValue = 0;
let cpuLastOpsSnapshot = 0;
let cpuDashboardTimer = null;
let cpuLagTimer = null;
let cpuLagValue = 0;

const setStatus = (message, state = "idle") => {
  cpuStatus.textContent = message;
  cpuStatus.dataset.state = state;
};

const addLog = (message) => {
  const item = document.createElement("li");
  item.textContent = message;
  cpuLog.prepend(item);

  while (cpuLog.children.length > 5) {
    cpuLog.removeChild(cpuLog.lastElementChild);
  }
};

const formatCompact = (value) => {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return `${Math.round(value)}`;
};

const formatClock = (milliseconds) => {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
};

const syncCpuLabels = () => {
  cpuWorkersLabel.textContent = cpuWorkers.value;
  cpuIntensityLabel.textContent = cpuIntensity.value;
};

const buildWorkerCards = (count) => {
  cpuWorkerGrid.innerHTML = "";
  cpuWorkerStates = [];

  for (let index = 0; index < count; index += 1) {
    const card = document.createElement("div");
    card.className = "cpu-worker-card";
    card.innerHTML = `
      <strong>Worker ${index + 1}</strong>
      <span>Idle</span>
    `;
    cpuWorkerGrid.appendChild(card);
    cpuWorkerStates.push({
      element: card,
      operations: 0,
      pulseTimer: 0,
    });
  }
};

const createCpuWorkerUrl = () => {
  if (cpuBlobUrl) {
    return cpuBlobUrl;
  }

  const workerSource = `
    self.onmessage = (event) => {
      if (event.data.type !== "start") {
        return;
      }

      const intensity = Number(event.data.intensity) || 6000;
      let seed = 1.234567 + Number(event.data.index || 0);

      const crunch = () => {
        let operations = 0;
        const sliceEnd = performance.now() + 65;

        while (performance.now() < sliceEnd) {
          for (let step = 1; step <= intensity; step += 1) {
            seed = Math.sin(seed + step * 0.00011) * Math.cos(seed * 0.5 + step * 0.00017) + Math.sqrt((step % 97) + seed * seed + 1.000001);
          }
          operations += intensity;
        }

        self.postMessage({ operations, seed });
        setTimeout(crunch, 0);
      };

      crunch();
    };
  `;

  cpuBlobUrl = URL.createObjectURL(new Blob([workerSource], { type: "text/javascript" }));
  return cpuBlobUrl;
};

const startLagProbe = () => {
  let expected = performance.now() + 200;

  const probe = () => {
    const now = performance.now();
    cpuLagValue = Math.max(0, now - expected);
    expected = now + 200;
    cpuLagTimer = window.setTimeout(probe, 200);
  };

  cpuLagTimer = window.setTimeout(probe, 200);
};

const stopLagProbe = () => {
  if (cpuLagTimer) {
    window.clearTimeout(cpuLagTimer);
    cpuLagTimer = null;
  }
};

const updateCpuDashboard = () => {
  if (!cpuStartedAt) {
    return;
  }

  cpuElapsed.textContent = formatClock(Date.now() - cpuStartedAt);
  cpuOpsRate.textContent = `${formatCompact(cpuTotalOperationsValue - cpuLastOpsSnapshot)}/dtk`;
  cpuLastOpsSnapshot = cpuTotalOperationsValue;
  cpuTotalOps.textContent = formatCompact(cpuTotalOperationsValue);
  cpuUiLag.textContent = `${cpuLagValue.toFixed(0)} ms`;
};

const stopCpuStress = ({ silent = false } = {}) => {
  cpuWorkersRunning.forEach((worker) => worker.terminate());
  cpuWorkersRunning = [];
  cpuWorkerCount.textContent = "0";

  if (cpuDashboardTimer) {
    window.clearInterval(cpuDashboardTimer);
    cpuDashboardTimer = null;
  }

  stopLagProbe();

  cpuStart.disabled = false;
  cpuStop.disabled = true;
  cpuStartedAt = 0;

  if (!silent) {
    setStatus("Stress CPU dihentikan.", "idle");
    addLog("Stress test CPU dihentikan.");
  }
};

const startCpuStress = () => {
  stopCpuStress({ silent: true });

  const workerCount = Number(cpuWorkers.value);
  const intensity = Number(cpuIntensity.value);

  cpuTotalOperationsValue = 0;
  cpuLastOpsSnapshot = 0;
  cpuLagValue = 0;
  cpuStartedAt = Date.now();

  buildWorkerCards(workerCount);
  const workerUrl = createCpuWorkerUrl();

  for (let index = 0; index < workerCount; index += 1) {
    const worker = new Worker(workerUrl);

    worker.onmessage = (event) => {
      const workerState = cpuWorkerStates[index];
      cpuTotalOperationsValue += event.data.operations;

      if (!workerState) {
        return;
      }

      workerState.operations += event.data.operations;
      workerState.element.classList.add("is-busy");
      workerState.element.querySelector("span").textContent = `${formatCompact(workerState.operations)} operasi`;

      window.clearTimeout(workerState.pulseTimer);
      workerState.pulseTimer = window.setTimeout(() => {
        workerState.element.classList.remove("is-busy");
      }, 180);
    };

    worker.postMessage({
      type: "start",
      intensity,
      index,
    });

    cpuWorkersRunning.push(worker);
  }

  cpuWorkerCount.textContent = String(workerCount);
  cpuStart.disabled = true;
  cpuStop.disabled = false;
  cpuDashboardTimer = window.setInterval(updateCpuDashboard, 1000);
  startLagProbe();
  updateCpuDashboard();

  setStatus(`Stress CPU berjalan dengan ${workerCount} worker dan intensitas ${intensity}.`, "pending");
  addLog(`Stress CPU dimulai: ${workerCount} worker, intensitas ${intensity}.`);
};

cpuWorkers.max = String(Math.min(16, logicalCores));
cpuWorkers.value = String(Math.min(2, logicalCores));
cpuCoreCount.textContent = String(logicalCores);

cpuWorkers?.addEventListener("input", syncCpuLabels);
cpuIntensity?.addEventListener("input", syncCpuLabels);
cpuStart?.addEventListener("click", startCpuStress);
cpuStop?.addEventListener("click", () => {
  stopCpuStress();
});

window.addEventListener("beforeunload", () => {
  stopCpuStress({ silent: true });
  if (cpuBlobUrl) {
    URL.revokeObjectURL(cpuBlobUrl);
  }
});

syncCpuLabels();
cpuStop.disabled = true;
cpuOpsRate.textContent = "-";
cpuUiLag.textContent = "-";
