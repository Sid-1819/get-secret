import { LOG_PREFIX } from "./debug.js";

const Z = 2147483646;
const ICON_BUSY = "⏳";

/**
 * Inline SVG so the control stays visible under strict page CSP (`img-src` often
 * blocks `chrome-extension://` for nodes injected into the page DOM).
 */
const ICON_DATA_URI =
  "data:image/svg+xml;charset=utf-8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#1e40af" d="M17 3H5a2 2 0 0 0-2 2v14h4v-2h6v2h4V7l-4-4zm-5 12H9v-2h3v2zm3 0h-2v-2h2v2zm2-4H7V7h10v4z"/></svg>',
  );

const ICON_BG = "rgba(255,255,255,0.95)";
const ICON_BG_BUSY = "rgba(255,255,255,0.85)";
const ICON_BORDER = "1px solid rgba(15,23,42,0.14)";
const ICON_BORDER_BUSY = "1px solid rgba(15,23,42,0.12)";
const ICON_SHADOW =
  "0 1px 2px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.08)";

let iconButton: HTMLButtonElement | null = null;
let iconTarget: Element | null = null;
let busy = false;
let saveInFlight = false;

let toastEl: HTMLDivElement | null = null;
let toastTimer: ReturnType<typeof setTimeout> | null = null;

function reposition(): void {
  if (!iconButton || !iconTarget) return;
  const rect = iconTarget.getBoundingClientRect();
  const inset = 6;
  const size = 32;

  // Top-right inside the field (viewport coords match getBoundingClientRect).
  let left = rect.right - size - inset;
  let top = rect.top + inset;

  const minLeft = rect.left + inset;
  const maxLeft = rect.right - size - inset;
  const minTop = rect.top + inset;
  const maxTop = rect.bottom - size - inset;

  if (maxLeft >= minLeft) {
    left = Math.min(Math.max(left, minLeft), maxLeft);
  } else {
    left = rect.left + Math.max(0, (rect.width - size) / 2);
  }
  if (maxTop >= minTop) {
    top = Math.min(Math.max(top, minTop), maxTop);
  } else {
    top = rect.top + Math.max(0, (rect.height - size) / 2);
  }

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  left = Math.min(Math.max(left, 8), vw - size - 8);
  top = Math.min(Math.max(top, 8), vh - size - 8);

  iconButton.style.left = `${left}px`;
  iconButton.style.top = `${top}px`;
}

function onScrollOrResize(): void {
  reposition();
}

function tearDownListeners(): void {
  window.removeEventListener("scroll", onScrollOrResize, true);
  window.removeEventListener("resize", onScrollOrResize);
}

function removeIcon(): void {
  tearDownListeners();
  iconButton?.remove();
  iconButton = null;
  iconTarget = null;
  busy = false;
  saveInFlight = false;
}

/** Remove floating save control immediately (e.g. icon disabled in settings). */
export function removeFloatingIcon(): void {
  removeIcon();
}

/**
 * After focus leaves a field, remove the control unless focus moved to our
 * button or is still inside the same field host (e.g. contenteditable child).
 */
export function dismissIconIfFocusMovedAway(): void {
  window.setTimeout(() => {
    if (!iconButton || !iconTarget) return;
    const active = document.activeElement;
    if (active && (active === iconButton || iconButton.contains(active))) {
      return;
    }
    if (active && (iconTarget === active || iconTarget.contains(active))) {
      return;
    }
    removeIcon();
  }, 0);
}

export function setIconLoading(loading: boolean): void {
  if (!iconButton) return;
  busy = loading;
  const imgEl = iconButton.querySelector<HTMLImageElement>("img");
  let busyEl = iconButton.querySelector<HTMLElement>("[data-vanixx-busy]");
  if (loading) {
    if (imgEl) imgEl.style.opacity = "0.28";
    if (!busyEl) {
      busyEl = document.createElement("span");
      busyEl.setAttribute("data-vanixx-busy", "");
      busyEl.textContent = ICON_BUSY;
      busyEl.setAttribute("aria-hidden", "true");
      busyEl.style.cssText =
        "position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:14px;line-height:1;pointer-events:none";
      iconButton.appendChild(busyEl);
    }
  } else {
    if (imgEl) imgEl.style.opacity = "1";
    busyEl?.remove();
  }
  iconButton.style.background = loading ? ICON_BG_BUSY : ICON_BG;
  iconButton.style.border = loading ? ICON_BORDER_BUSY : ICON_BORDER;
  iconButton.style.pointerEvents = loading ? "none" : "auto";
}

export function attachIcon(target: Element, onClick: () => void | Promise<void>): void {
  removeIcon();

  const button = document.createElement("button");
  button.type = "button";
  button.tabIndex = -1;
  button.setAttribute("aria-label", "Save to getsecret");

  const img = document.createElement("img");
  img.src = ICON_DATA_URI;
  img.alt = "";
  img.draggable = false;
  img.style.cssText =
    "width:22px;height:22px;display:block;object-fit:contain;pointer-events:none;user-select:none";

  button.appendChild(img);

  button.style.cssText = [
    "position:fixed",
    "box-sizing:border-box",
    `z-index:${Z}`,
    "width:32px",
    "height:32px",
    "padding:0",
    "margin:0",
    `border:${ICON_BORDER}`,
    "border-radius:8px",
    `background:${ICON_BG}`,
    `box-shadow:${ICON_SHADOW}`,
    "outline:none",
    "-webkit-appearance:none",
    "appearance:none",
    "cursor:pointer",
    "display:flex",
    "align-items:center",
    "justify-content:center",
    "font-family:system-ui,sans-serif",
    "transition:transform 0.12s ease,filter 0.12s ease",
  ].join(";");

  button.addEventListener("mouseenter", () => {
    if (busy) return;
    button.style.transform = "scale(1.06)";
    img.style.filter = "brightness(1.12)";
  });
  button.addEventListener("mouseleave", () => {
    button.style.transform = "";
    img.style.filter = "";
  });

  button.addEventListener("mousedown", (e) => {
    e.preventDefault();
  });

  button.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (busy || saveInFlight) return;
    saveInFlight = true;
    try {
      await onClick();
    } finally {
      saveInFlight = false;
    }
  });

  iconButton = button;
  iconTarget = target;
  document.documentElement.appendChild(button);
  const tr = target.getBoundingClientRect();
  reposition();
  console.log(LOG_PREFIX, "attachIcon: mounted + positioned", {
    targetTag: target.tagName,
    targetRect: {
      top: tr.top,
      left: tr.left,
      width: tr.width,
      height: tr.height,
    },
    buttonCssPos: { left: button.style.left, top: button.style.top },
    viewport: { w: window.innerWidth, h: window.innerHeight },
    zIndex: Z,
  });
  window.addEventListener("scroll", onScrollOrResize, true);
  window.addEventListener("resize", onScrollOrResize);
}

export function showToast(message: string): void {
  if (toastEl?.isConnected) {
    toastEl.remove();
  }
  if (toastTimer) {
    clearTimeout(toastTimer);
    toastTimer = null;
  }

  const el = document.createElement("div");
  el.textContent = message;
  el.style.cssText = [
    "position:fixed",
    `z-index:${Z}`,
    "right:16px",
    "bottom:16px",
    "max-width:min(360px,calc(100vw - 32px))",
    "padding:10px 14px",
    "background:rgba(32,32,32,0.92)",
    "color:#fff",
    "font:14px/1.4 system-ui,sans-serif",
    "border-radius:8px",
    "box-shadow:0 4px 16px rgba(0,0,0,0.25)",
    "pointer-events:none",
  ].join(";");

  document.documentElement.appendChild(el);
  toastEl = el;

  toastTimer = setTimeout(() => {
    el.remove();
    if (toastEl === el) toastEl = null;
    toastTimer = null;
  }, 2000);
}
