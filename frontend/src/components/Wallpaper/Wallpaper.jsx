// Abstract animated background shown behind every page.
// Purely decorative: fixed, behind all content, ignores the mouse.
function Wallpaper() {
  return (
    <div aria-hidden="true" className="wallpaper">
      <div className="wallpaper-blob b1" />
      <div className="wallpaper-blob b2" />
      <div className="wallpaper-blob b3" />
      <div className="wallpaper-blob b4" />

      {/* Flowing lines */}
      <svg
        className="wallpaper-lines"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        <path
          d="M-80 620 C 240 470, 470 760, 760 600 S 1210 330, 1520 470"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M-80 660 C 260 520, 500 800, 790 640 S 1230 380, 1520 520"
          stroke="currentColor"
          strokeWidth="1"
        />
        <path
          d="M-80 700 C 280 570, 530 840, 820 680 S 1250 430, 1520 570"
          stroke="currentColor"
          strokeWidth="0.75"
        />
        <circle
          cx="1180"
          cy="170"
          r="120"
          stroke="currentColor"
          strokeWidth="1"
        />
        <circle
          cx="1180"
          cy="170"
          r="180"
          stroke="currentColor"
          strokeWidth="0.6"
        />
      </svg>

      <div className="wallpaper-grid" />
      <div className="wallpaper-grain" />
    </div>
  );
}

export default Wallpaper;
