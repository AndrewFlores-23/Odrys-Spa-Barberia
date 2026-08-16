(() => {
  document.querySelectorAll("[data-comparison]").forEach((comparison) => {
    const input = comparison.querySelector('input[type="range"]');
    if (!input) return;
    const update = () => comparison.style.setProperty("--position", `${input.value}%`);
    input.addEventListener("input", update);
    input.addEventListener("change", update);
    update();
  });
})();
