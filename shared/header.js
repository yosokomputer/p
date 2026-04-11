(function () {
  const mount = document.querySelector("[data-shared-header]");

  if (!mount) {
    return;
  }

  const assetPath = mount.dataset.assetPath || ".";
  const homePath = mount.dataset.homePath || "./index.html";
  const basePath = homePath.replace(/index\.html(?:#.*)?$/i, "");
  const testKeyboardPath = mount.dataset.testKeyboardPath || `${basePath}test-keyboard/`;
  const testCameraPath = mount.dataset.testCameraPath || `${basePath}test-camera/`;
  const testAudioPath = mount.dataset.testAudioPath || `${basePath}test-audio/`;
  const testMicPath = mount.dataset.testMicPath || `${basePath}test-mic/`;
  const testScreenPath = mount.dataset.testScreenPath || `${basePath}test-screen/`;
  const testSpeedPath = mount.dataset.testSpeedPath || `${basePath}test-speed/`;
  const testMousePath = mount.dataset.testMousePath || `${basePath}test-mouse/`;
  const testBatteryPath = mount.dataset.testBatteryPath || `${basePath}test-battery/`;
  const testCpuPath = mount.dataset.testCpuPath || `${basePath}test-cpu/`;
  const testGpuPath = mount.dataset.testGpuPath || `${basePath}test-gpu/`;

  mount.innerHTML = `
    <header class="topbar">
      <div class="container topbar-inner">
        <a class="brand" href="${homePath}#home" aria-label="Yoso Komputer">
          <span class="brand-mark">
            <img src="${assetPath}/file/logo.jpg" alt="Logo Yoso Komputer" />
          </span>
          <span class="brand-copy">
            <strong>Yoso Komputer</strong>
            <small>Servis Komputer & Laptop</small>
          </span>
        </a>

        <button class="menu-toggle" type="button" aria-label="Buka menu">
          <span></span>
          <span></span>
          <span></span>
        </button>

        <nav class="nav">
          <a data-nav="layanan" href="${homePath}#layanan">Layanan</a>
          <a data-nav="tentang" href="${homePath}#tentang">Tentang</a>
          <a data-nav="proses" href="${homePath}#proses">Proses</a>
          <a data-nav="kontak" href="${homePath}#kontak">Kontak</a>
          <div class="nav-group" data-nav-group="tools">
            <button class="nav-parent" type="button" data-nav="tools" aria-expanded="false">
              Tools
            </button>
            <div class="nav-submenu">
              <a data-nav="test-keyboard" href="${testKeyboardPath}">Test Keyboard</a>
              <a data-nav="test-camera" href="${testCameraPath}">Test Kamera</a>
              <a data-nav="test-audio" href="${testAudioPath}">Test Audio</a>
              <a data-nav="test-mic" href="${testMicPath}">Test Mic</a>
              <a data-nav="test-screen" href="${testScreenPath}">Test Layar</a>
              <a data-nav="test-speed" href="${testSpeedPath}">Speedtest</a>
              <a data-nav="test-mouse" href="${testMousePath}">Test Mouse</a>
              <a data-nav="test-battery" href="${testBatteryPath}">Test Baterai</a>
              <a data-nav="test-cpu" href="${testCpuPath}">Stress CPU</a>
              <a data-nav="test-gpu" href="${testGpuPath}">Stress GPU</a>
            </div>
          </div>
        </nav>

        <a class="button button-primary desktop-cta" href="https://wa.me/6285183190794" target="_blank" rel="noreferrer">
          WhatsApp
        </a>
      </div>
    </header>
  `;

  const navLinks = [...mount.querySelectorAll(".nav a")];
  const navParent = mount.querySelector('.nav-parent[data-nav="tools"]');
  const navGroup = mount.querySelector('[data-nav-group="tools"]');

  const normalizePath = (pathname) => pathname.replace(/\/index\.html$/i, "/").replace(/\/+$/, "/");

  const syncActiveNav = () => {
    const currentPath = normalizePath(window.location.pathname);
    const currentHash = window.location.hash.replace("#", "");

    navLinks.forEach((link) => {
      link.classList.remove("active");
    });
    if (navParent) {
      navParent.classList.remove("active");
    }
    if (navGroup) {
      navGroup.classList.remove("active");
    }

    if (currentHash) {
      const hashLink = mount.querySelector(`.nav a[data-nav="${currentHash}"]`);
      if (hashLink) {
        hashLink.classList.add("active");
        return;
      }
    }

    const toolLinks = [
      "test-keyboard",
      "test-camera",
      "test-audio",
      "test-mic",
      "test-screen",
      "test-speed",
      "test-mouse",
      "test-battery",
      "test-cpu",
      "test-gpu",
    ]
      .map((navId) => mount.querySelector(`.nav a[data-nav="${navId}"]`))
      .filter(Boolean);

    for (const toolLink of toolLinks) {
      const toolPathname = normalizePath(new URL(toolLink.href, window.location.href).pathname);
      if (currentPath === toolPathname) {
        toolLink.classList.add("active");
        if (navParent) {
          navParent.classList.add("active");
        }
        if (navGroup) {
          navGroup.classList.add("active");
        }
        return;
      }
    }
  };

  if (navParent && navGroup) {
    navParent.addEventListener("click", () => {
      const isOpen = navGroup.classList.toggle("is-open");
      navParent.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });
  }

  syncActiveNav();
  window.addEventListener("hashchange", syncActiveNav);
})();
