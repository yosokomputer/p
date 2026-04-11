const mouseClickCount = document.querySelector("#mouse-click-count");
const mouseScrollCount = document.querySelector("#mouse-scroll-count");
const mousePointerType = document.querySelector("#mouse-pointer-type");
const mouseReset = document.querySelector("#mouse-reset");
const mouseStatus = document.querySelector("#mouse-status");
const mousePad = document.querySelector("#mouse-pad");
const mousePadCanvas = document.querySelector("#mouse-pad-canvas");
const mousePosition = document.querySelector("#mouse-position");
const mouseAction = document.querySelector("#mouse-action");
const mouseDragState = document.querySelector("#mouse-drag-state");
const mouseLog = document.querySelector("#mouse-log");
const mouseLeftState = document.querySelector("#mouse-left-state");
const mouseMiddleState = document.querySelector("#mouse-middle-state");
const mouseRightState = document.querySelector("#mouse-right-state");
const mouseWheelState = document.querySelector("#mouse-wheel-state");

const mouseContext = mousePadCanvas?.getContext("2d");

let totalMouseClicks = 0;
let totalMouseScrolls = 0;
let dragging = false;
let lastPoint = null;

const mouseButtons = {
  0: mouseLeftState,
  1: mouseMiddleState,
  2: mouseRightState,
};

const setStatus = (message, state = "idle") => {
  mouseStatus.textContent = message;
  mouseStatus.dataset.state = state;
};

const addLog = (message) => {
  const item = document.createElement("li");
  item.textContent = message;
  mouseLog.prepend(item);

  while (mouseLog.children.length > 5) {
    mouseLog.removeChild(mouseLog.lastElementChild);
  }
};

const resizeCanvas = () => {
  if (!mousePad || !mousePadCanvas || !mouseContext) {
    return;
  }

  const ratio = window.devicePixelRatio || 1;
  const rect = mousePad.getBoundingClientRect();

  mousePadCanvas.width = Math.floor(rect.width * ratio);
  mousePadCanvas.height = Math.floor(rect.height * ratio);
  mousePadCanvas.style.width = `${rect.width}px`;
  mousePadCanvas.style.height = `${rect.height}px`;
  mouseContext.setTransform(ratio, 0, 0, ratio, 0, 0);
  mouseContext.lineCap = "round";
  mouseContext.lineJoin = "round";
};

const getPointerPosition = (event) => {
  const rect = mousePad.getBoundingClientRect();
  return {
    x: Math.max(0, Math.min(rect.width, event.clientX - rect.left)),
    y: Math.max(0, Math.min(rect.height, event.clientY - rect.top)),
  };
};

const pulseState = (element) => {
  if (!element) {
    return;
  }

  element.classList.add("is-active");
  window.clearTimeout(element._pulseTimer);
  element._pulseTimer = window.setTimeout(() => {
    element.classList.remove("is-active");
  }, 220);
};

const drawTrail = (fromPoint, toPoint, color) => {
  if (!mouseContext || !fromPoint || !toPoint) {
    return;
  }

  const rect = mousePad.getBoundingClientRect();
  mouseContext.fillStyle = "rgba(12, 18, 24, 0.04)";
  mouseContext.fillRect(0, 0, rect.width, rect.height);

  mouseContext.strokeStyle = color;
  mouseContext.lineWidth = dragging ? 3.5 : 2.2;
  mouseContext.beginPath();
  mouseContext.moveTo(fromPoint.x, fromPoint.y);
  mouseContext.lineTo(toPoint.x, toPoint.y);
  mouseContext.stroke();

  mouseContext.fillStyle = color;
  mouseContext.beginPath();
  mouseContext.arc(toPoint.x, toPoint.y, dragging ? 4 : 3, 0, Math.PI * 2);
  mouseContext.fill();
};

const resetMouseTester = () => {
  totalMouseClicks = 0;
  totalMouseScrolls = 0;
  dragging = false;
  lastPoint = null;

  mouseClickCount.textContent = "0";
  mouseScrollCount.textContent = "0";
  mousePointerType.textContent = "-";
  mousePosition.textContent = "-";
  mouseAction.textContent = "Belum ada";
  mouseDragState.textContent = "Tidak";

  Object.values(mouseButtons).forEach((element) => element?.classList.remove("is-active"));
  mouseWheelState?.classList.remove("is-active");

  if (mouseContext && mousePad) {
    const rect = mousePad.getBoundingClientRect();
    mouseContext.clearRect(0, 0, rect.width, rect.height);
  }

  mouseLog.innerHTML = "<li>Tester mouse di-reset dan siap dipakai lagi.</li>";
  setStatus("Tester mouse di-reset. Coba klik, drag, atau scroll lagi.", "idle");
};

mousePad?.addEventListener("pointermove", (event) => {
  const position = getPointerPosition(event);
  mousePosition.textContent = `${Math.round(position.x)} x ${Math.round(position.y)}`;
  mousePointerType.textContent = event.pointerType || "mouse";

  if (lastPoint) {
    drawTrail(lastPoint, position, dragging ? "rgba(255, 107, 107, 0.82)" : "rgba(40, 199, 111, 0.82)");
  }

  lastPoint = position;
});

mousePad?.addEventListener("pointerdown", (event) => {
  totalMouseClicks += 1;
  dragging = true;

  mouseClickCount.textContent = String(totalMouseClicks);
  mousePointerType.textContent = event.pointerType || "mouse";
  mouseAction.textContent = `Pointer down tombol ${event.button}`;
  mouseDragState.textContent = "Ya";

  const stateElement = mouseButtons[event.button];
  pulseState(stateElement);
  setStatus("Klik terdeteksi. Lanjutkan dengan drag atau klik tombol lain untuk mengetes semua tombol.", "success");
  addLog(`Klik tombol ${event.button} terdeteksi (${event.pointerType || "mouse"}).`);
});

mousePad?.addEventListener("pointerup", (event) => {
  dragging = false;
  mouseAction.textContent = `Pointer up tombol ${event.button}`;
  mouseDragState.textContent = "Tidak";
});

mousePad?.addEventListener("pointerleave", () => {
  dragging = false;
  lastPoint = null;
  mouseDragState.textContent = "Tidak";
});

mousePad?.addEventListener(
  "wheel",
  (event) => {
    event.preventDefault();

    totalMouseScrolls += 1;
    mouseScrollCount.textContent = String(totalMouseScrolls);
    mouseAction.textContent = event.deltaY < 0 ? "Scroll atas" : "Scroll bawah";
    pulseState(mouseWheelState);
    setStatus("Event wheel / scroll terdeteksi.", "success");
    addLog(`Scroll ${event.deltaY < 0 ? "atas" : "bawah"} terdeteksi.`);
  },
  { passive: false }
);

mousePad?.addEventListener("dblclick", () => {
  mouseAction.textContent = "Double click";
  setStatus("Double click berhasil terdeteksi.", "success");
  addLog("Double click terdeteksi.");
});

mousePad?.addEventListener("contextmenu", (event) => {
  event.preventDefault();
  mouseAction.textContent = "Klik kanan / context menu";
  pulseState(mouseRightState);
  addLog("Klik kanan terdeteksi.");
});

mouseReset?.addEventListener("click", resetMouseTester);

window.addEventListener("resize", resizeCanvas);

resizeCanvas();
resetMouseTester();
