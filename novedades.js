(function () {
  const section = document.querySelector(".news-section");
  if (!section) return;

  const buttons = [...section.querySelectorAll("[data-news-target]")];
  const panels = [...section.querySelectorAll("[data-news-panel]")];

  function showNews(side) {
    section.dataset.side = side;
    buttons.forEach((button) => {
      const selected = button.dataset.newsTarget === side;
      button.classList.toggle("is-active", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    panels.forEach((panel) => {
      panel.hidden = panel.dataset.newsPanel !== side;
    });
  }

  buttons.forEach((button) => {
    button.addEventListener("click", () => showNews(button.dataset.newsTarget));
  });

  const requestedSide = new URLSearchParams(window.location.search).get("news");
  showNews(requestedSide === "spa" ? "spa" : "barberia");
})();
