const gpuSupport = document.querySelector("#gpu-support");
const gpuFps = document.querySelector("#gpu-fps");
const gpuQualityState = document.querySelector("#gpu-quality-state");
const gpuQuality = document.querySelector("#gpu-quality");
const gpuQualityLabel = document.querySelector("#gpu-quality-label");
const gpuStart = document.querySelector("#gpu-start");
const gpuStop = document.querySelector("#gpu-stop");
const gpuFullscreen = document.querySelector("#gpu-fullscreen");
const gpuStatus = document.querySelector("#gpu-status");
const gpuStage = document.querySelector("#gpu-stage");
const gpuCanvas = document.querySelector("#gpu-canvas");
const gpuRenderer = document.querySelector("#gpu-renderer");
const gpuResolution = document.querySelector("#gpu-resolution");
const gpuElapsed = document.querySelector("#gpu-elapsed");
const gpuLog = document.querySelector("#gpu-log");

let gl = null;
let gpuProgram = null;
let gpuBuffer = null;
let gpuUniforms = null;
let gpuAnimationFrame = 0;
let gpuStartedAt = 0;
let gpuLastFpsSample = 0;
let gpuFrameCounter = 0;

const vertexSource = `
  attribute vec2 position;
  void main() {
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const fragmentSource = `
  precision mediump float;

  uniform vec2 uResolution;
  uniform float uTime;
  uniform float uIntensity;

  vec3 palette(float t) {
    return 0.5 + 0.5 * cos(6.28318 * (vec3(0.02, 0.24, 0.56) + t));
  }

  void main() {
    vec2 uv = (gl_FragCoord.xy * 2.0 - uResolution.xy) / min(uResolution.x, uResolution.y);
    float t = uTime * 0.4;
    float intensity = uIntensity;
    vec2 p = uv;
    float wave = 0.0;

    for (int i = 0; i < 7; i++) {
      float fi = float(i);
      p += 0.16 * vec2(sin(t * 0.9 + fi * 1.7), cos(t * 0.7 + fi * 1.3));
      wave += sin((p.x * (3.0 + fi * 0.22)) * intensity + t * (1.15 + fi * 0.08))
        * cos((p.y * (4.1 + fi * 0.27)) * intensity - t * (1.05 + fi * 0.07));
      p *= 1.08 + intensity * 0.04;
    }

    wave /= 7.0;
    float glow = smoothstep(1.5, 0.1, length(uv));
    vec3 color = palette(wave * 0.18 + t * 0.05);
    color += vec3(1.0, 0.48, 0.12) * glow * 0.28;
    color *= 0.7 + 0.85 * abs(wave);

    gl_FragColor = vec4(color, 1.0);
  }
`;

const setStatus = (message, state = "idle") => {
  gpuStatus.textContent = message;
  gpuStatus.dataset.state = state;
};

const addLog = (message) => {
  const item = document.createElement("li");
  item.textContent = message;
  gpuLog.prepend(item);

  while (gpuLog.children.length > 5) {
    gpuLog.removeChild(gpuLog.lastElementChild);
  }
};

const formatClock = (milliseconds) => {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
};

const compileShader = (type, source) => {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) || "Shader compile error";
    gl.deleteShader(shader);
    throw new Error(message);
  }

  return shader;
};

const initGpuProgram = () => {
  if (gl && gpuProgram) {
    return true;
  }

  gl = gpuCanvas.getContext("webgl", {
    antialias: false,
    alpha: false,
    depth: false,
    stencil: false,
    preserveDrawingBuffer: false,
  });

  if (!gl) {
    gpuSupport.textContent = "Tidak didukung";
    gpuRenderer.textContent = "WebGL tidak tersedia";
    setStatus("Browser atau GPU ini tidak mendukung WebGL untuk stress test.", "error");
    return false;
  }

  const vertexShader = compileShader(gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentSource);

  gpuProgram = gl.createProgram();
  gl.attachShader(gpuProgram, vertexShader);
  gl.attachShader(gpuProgram, fragmentShader);
  gl.linkProgram(gpuProgram);

  if (!gl.getProgramParameter(gpuProgram, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(gpuProgram) || "Program link error";
    throw new Error(message);
  }

  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  gpuBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, gpuBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([
      -1, -1,
      1, -1,
      -1, 1,
      1, 1,
    ]),
    gl.STATIC_DRAW
  );

  const positionLocation = gl.getAttribLocation(gpuProgram, "position");
  gl.enableVertexAttribArray(positionLocation);
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

  gpuUniforms = {
    resolution: gl.getUniformLocation(gpuProgram, "uResolution"),
    time: gl.getUniformLocation(gpuProgram, "uTime"),
    intensity: gl.getUniformLocation(gpuProgram, "uIntensity"),
  };

  const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
  gpuRenderer.textContent = debugInfo
    ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
    : gl.getParameter(gl.RENDERER);
  gpuSupport.textContent = "Tersedia";
  return true;
};

const updateQualityLabel = () => {
  const label = `${Number(gpuQuality.value).toFixed(2)}x`;
  gpuQualityLabel.textContent = label;
  gpuQualityState.textContent = label;
};

const resizeGpuCanvas = () => {
  if (!gl || !gpuStage) {
    return;
  }

  const scale = Number(gpuQuality.value);
  const ratio = Math.min(window.devicePixelRatio || 1, 2) * scale;
  const width = Math.max(320, Math.floor(gpuStage.clientWidth * ratio));
  const height = Math.max(220, Math.floor(gpuStage.clientHeight * ratio));

  if (gpuCanvas.width !== width || gpuCanvas.height !== height) {
    gpuCanvas.width = width;
    gpuCanvas.height = height;
    gl.viewport(0, 0, width, height);
  }

  gpuResolution.textContent = `${width} x ${height}`;
};

const stopGpuStress = ({ silent = false } = {}) => {
  if (gpuAnimationFrame) {
    window.cancelAnimationFrame(gpuAnimationFrame);
    gpuAnimationFrame = 0;
  }

  gpuStart.disabled = false;
  gpuStop.disabled = true;

  if (!silent) {
    setStatus("Stress GPU dihentikan.", "idle");
    addLog("Stress test GPU dihentikan.");
  }
};

const renderGpuFrame = (now) => {
  if (!gl || !gpuProgram) {
    return;
  }

  if (!gpuStartedAt) {
    gpuStartedAt = now;
    gpuLastFpsSample = now;
  }

  resizeGpuCanvas();
  gl.useProgram(gpuProgram);
  gl.uniform2f(gpuUniforms.resolution, gpuCanvas.width, gpuCanvas.height);
  gl.uniform1f(gpuUniforms.time, (now - gpuStartedAt) / 1000);
  gl.uniform1f(gpuUniforms.intensity, Number(gpuQuality.value) * 1.35);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  gpuFrameCounter += 1;
  if (now - gpuLastFpsSample >= 500) {
    const fpsValue = (gpuFrameCounter * 1000) / (now - gpuLastFpsSample);
    gpuFps.textContent = `${fpsValue.toFixed(0)} FPS`;
    gpuFrameCounter = 0;
    gpuLastFpsSample = now;
  }

  gpuElapsed.textContent = formatClock(now - gpuStartedAt);
  gpuAnimationFrame = window.requestAnimationFrame(renderGpuFrame);
};

const startGpuStress = () => {
  if (gpuAnimationFrame) {
    return;
  }

  try {
    if (!initGpuProgram()) {
      return;
    }
  } catch (error) {
    gpuSupport.textContent = "Gagal";
    gpuRenderer.textContent = "Shader error";
    setStatus("Gagal menyiapkan shader WebGL untuk stress test GPU.", "error");
    addLog(`Gagal inisialisasi GPU test: ${error.message}`);
    return;
  }

  updateQualityLabel();
  resizeGpuCanvas();
  gpuStartedAt = 0;
  gpuFrameCounter = 0;
  gpuFps.textContent = "0 FPS";
  gpuStart.disabled = true;
  gpuStop.disabled = false;
  setStatus(`Stress GPU berjalan pada skala render ${Number(gpuQuality.value).toFixed(2)}x.`, "pending");
  addLog(`Stress GPU dimulai pada skala ${Number(gpuQuality.value).toFixed(2)}x.`);
  gpuAnimationFrame = window.requestAnimationFrame(renderGpuFrame);
};

const toggleGpuFullscreen = async () => {
  try {
    if (document.fullscreenElement === gpuStage) {
      await document.exitFullscreen();
    } else {
      await gpuStage.requestFullscreen();
    }
  } catch (error) {
    setStatus("Browser menolak fullscreen untuk area stress GPU.", "error");
    addLog(`Fullscreen GPU gagal: ${error.name || "UnknownError"}`);
  }
};

gpuQuality?.addEventListener("input", () => {
  updateQualityLabel();
  resizeGpuCanvas();
});

gpuStart?.addEventListener("click", startGpuStress);
gpuStop?.addEventListener("click", () => {
  stopGpuStress();
});
gpuFullscreen?.addEventListener("click", toggleGpuFullscreen);

window.addEventListener("resize", resizeGpuCanvas);
window.addEventListener("beforeunload", () => {
  stopGpuStress({ silent: true });
});

gpuStop.disabled = true;
updateQualityLabel();
gpuSupport.textContent = "Mengecek...";
