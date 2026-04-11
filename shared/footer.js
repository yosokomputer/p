(function () {
  const mount = document.querySelector("[data-shared-footer]");

  if (!mount) {
    return;
  }

  const assetPath = mount.dataset.assetPath || ".";

  mount.innerHTML = `
    <footer class="footer">
      <div class="container footer-inner">
        <div class="footer-brand">
          <img src="${assetPath}/file/logo.jpg" alt="Logo Yoso Komputer" />
          <p>&copy; <span id="year"></span> Yoso Komputer. Semua hak cipta dilindungi.</p>
        </div>
        <a href="https://wa.me/6285183190794" target="_blank" rel="noreferrer">WhatsApp: 085183190794</a>
      </div>
    </footer>
  `;
})();
