const pressCount = document.querySelector("#press-count");
const uniqueCount = document.querySelector("#unique-count");
const lastKey = document.querySelector("#last-key");
const eventKey = document.querySelector("#event-key");
const eventCode = document.querySelector("#event-code");
const eventLocation = document.querySelector("#event-location");
const testerLog = document.querySelector("#tester-log");
const testerStream = document.querySelector("#tester-stream");
const testerReset = document.querySelector("#tester-reset");
const platformTabs = [...document.querySelectorAll("[data-platform]")];
const keyCaps = new Map(
  [...document.querySelectorAll("[data-code]")].map((element) => [element.dataset.code, element])
);
const roleElements = new Map(
  [...document.querySelectorAll("[data-role]")].map((element) => [element.dataset.role, element])
);

let totalPresses = 0;
const uniquePressed = new Set();
const recentKeys = [];
let currentPlatform = "windows";

const locationLabels = {
  0: "Standard",
  1: "Left",
  2: "Right",
  3: "Numpad",
};

const platformLabels = {
  windows: {
    backspace: { primary: "Backspace", secondary: "Backspace" },
    capslock: { primary: "Caps Lock", secondary: "CapsLock" },
    enter: { primary: "Enter", secondary: "Enter" },
    "shift-left": { primary: "Shift", secondary: "Left" },
    "shift-right": { primary: "Shift", secondary: "Right" },
    "control-left": { primary: "Ctrl", secondary: "Left" },
    "control-right": { primary: "Ctrl", secondary: "Right" },
    "meta-left": { primary: "windows-icon", secondary: "Win", icon: "windows" },
    fn: { primary: "Fn", secondary: "Fn" },
    "alt-left": { primary: "Alt", secondary: "Left" },
    "alt-right": { primary: "Alt", secondary: "Right" },
    space: { primary: "Space", secondary: "Space" },
    "context-menu": { primary: "Menu", secondary: "Menu" },
  },
  mac: {
    backspace: { primary: "Delete", secondary: "Delete" },
    capslock: { primary: "Caps Lock", secondary: "Caps" },
    enter: { primary: "Return", secondary: "Return" },
    "shift-left": { primary: "Shift", secondary: "Left" },
    "shift-right": { primary: "Shift", secondary: "Right" },
    "control-left": { primary: "Control", secondary: "Ctrl" },
    "control-right": { primary: "Control", secondary: "Ctrl" },
    "meta-left": { primary: "command-icon", secondary: "Command", icon: "command" },
    fn: { primary: "Fn", secondary: "Globe" },
    "alt-left": { primary: "Option", secondary: "Opt" },
    "alt-right": { primary: "Option", secondary: "Opt" },
    space: { primary: "Space", secondary: "Space" },
    "context-menu": { primary: "Command", secondary: "Cmd" },
  },
};

const platformIcons = {
  windows: '<svg class="key-icon" viewBox="0 0 32 32" aria-hidden="true"><path d="M1 4.4 13.1 2.7v12H1Zm0 23.2 12.1 1.7V17.3H1Zm14 2 16 2.2V17.3H15Zm0-14.9H31V0L15 2.2Z"></path></svg>',
  command:
    '<svg class="key-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3a5 5 0 0 1 4 8h0v2h2a5 5 0 1 1-8 4H4a5 5 0 1 1 4-8h2V7a5 5 0 0 1-2-4Zm0 2a3 3 0 1 0 0 6h2V8a3 3 0 0 0-2-3Zm8 0a3 3 0 0 0-2 5.24V13h2a3 3 0 1 0 0-8ZM5 14a3 3 0 1 0 3 3v-2H5Zm11 0h-2v3a3 3 0 1 0 2-3Z"></path></svg>',
};

const normalizeKey = (key) => {
  if (key === " ") {
    return "Space";
  }

  if (!key) {
    return "Unknown";
  }

  return key;
};

const renderLog = () => {
  testerLog.innerHTML = "";

  if (!recentKeys.length) {
    const item = document.createElement("li");
    item.textContent = "Belum ada tombol yang ditekan.";
    testerLog.appendChild(item);
    return;
  }

  recentKeys.forEach((entry) => {
    const item = document.createElement("li");
    item.textContent = `${entry.key} (${entry.code})`;
    testerLog.appendChild(item);
  });
};

const renderStream = () => {
  testerStream.innerHTML = "";

  if (!recentKeys.length) {
    const item = document.createElement("span");
    item.textContent = "Menunggu input keyboard";
    testerStream.appendChild(item);
    return;
  }

  recentKeys.forEach((entry) => {
    const item = document.createElement("span");
    item.textContent = entry.key;
    testerStream.appendChild(item);
  });
};

const resetTester = () => {
  totalPresses = 0;
  uniquePressed.clear();
  recentKeys.length = 0;

  pressCount.textContent = "0";
  uniqueCount.textContent = "0";
  lastKey.textContent = "-";
  eventKey.textContent = "-";
  eventCode.textContent = "-";
  eventLocation.textContent = "-";

  keyCaps.forEach((element) => {
    element.classList.remove("is-pressed", "is-active");
  });

  renderLog();
  renderStream();
};

const updateKeyRole = (role, config) => {
  const element = roleElements.get(role);
  if (!element || !config) {
    return;
  }

  const primary = element.querySelector("span");
  const secondary = element.querySelector("small");

  if (primary) {
    if (config.icon && platformIcons[config.icon]) {
      primary.innerHTML = platformIcons[config.icon];
    } else {
      primary.textContent = config.primary;
    }
  }

  if (secondary) {
    secondary.textContent = config.secondary;
  }
};

const setPlatform = (platform) => {
  currentPlatform = platform;

  platformTabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.platform === platform);
  });

  Object.entries(platformLabels[platform]).forEach(([role, config]) => {
    updateKeyRole(role, config);
  });
};

window.addEventListener("keydown", (event) => {
  event.preventDefault();

  totalPresses += 1;
  uniquePressed.add(event.code);

  const normalizedKey = normalizeKey(event.key);

  pressCount.textContent = totalPresses;
  uniqueCount.textContent = uniquePressed.size;
  lastKey.textContent = normalizedKey;
  eventKey.textContent = normalizedKey;
  eventCode.textContent = event.code || "-";
  eventLocation.textContent = locationLabels[event.location] || "Unknown";

  recentKeys.unshift({
    key: normalizedKey,
    code: event.code || "Unknown",
  });
  recentKeys.splice(6);

  renderLog();
  renderStream();

  const keyCap = keyCaps.get(event.code);
  if (keyCap) {
    keyCap.classList.remove("is-active");
    keyCap.classList.add("is-pressed");
  }
});

window.addEventListener("keyup", (event) => {
  event.preventDefault();

  const keyCap = keyCaps.get(event.code);
  if (keyCap) {
    keyCap.classList.remove("is-pressed");
    keyCap.classList.add("is-active");
  }
});

window.addEventListener("blur", () => {
  keyCaps.forEach((element) => element.classList.remove("is-pressed"));
});

if (testerReset) {
  testerReset.addEventListener("click", resetTester);
}

platformTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    setPlatform(tab.dataset.platform);
  });
});

setPlatform(currentPlatform);
renderLog();
renderStream();
