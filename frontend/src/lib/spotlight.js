// Mouse-move handler for elements with the "spotlight" class:
// stores the cursor position so the CSS glow follows it.
export const trackSpotlight = (e) => {
  const rect = e.currentTarget.getBoundingClientRect();

  e.currentTarget.style.setProperty("--mx", `${e.clientX - rect.left}px`);
  e.currentTarget.style.setProperty("--my", `${e.clientY - rect.top}px`);
};
