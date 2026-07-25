import { FLOATING_ICON_ENABLED_KEY } from "../defaults.js";
import { buildShareUrl } from "../share-url.js";
import { LOG_PREFIX } from "./debug.js";
import { closestContentEditableHost, getText } from "./extractor.js";
import {
  attachIcon,
  dismissIconIfFocusMovedAway,
  removeFloatingIcon,
  setIconLoading,
  showToast,
} from "./ui.js";

// Skip input types that are not useful as note sources (non-text or non-note-like).
const skippedInputTypes = new Set([
  "hidden",
  "button",
  "submit",
  "reset",
  "image",
  "file",
  "checkbox",
  "radio",
  "range",
  "color",
]);

function resolveFieldHost(el: Element | null): Element | null {
  if (!el || !(el instanceof Element)) return null;

  if (el instanceof HTMLTextAreaElement) return el;

  if (el instanceof HTMLInputElement) {
    const t = (el.type || "text").toLowerCase();
    if (skippedInputTypes.has(t)) return null;
    return el;
  }

  const ce = closestContentEditableHost(el);
  return ce ?? null;
}

function summarizeNode(node: EventTarget | null): string {
  if (node == null) return "null";
  if (!(node instanceof Element)) {
    return node instanceof Node ? node.nodeName : String(node);
  }
  const id = node.id ? `#${node.id}` : "";
  const ce = node.getAttribute("contenteditable");
  const role = node.getAttribute("role");
  const parts = [`<${node.tagName.toLowerCase()}${id}>`];
  if (ce != null) parts.push(`contenteditable=${JSON.stringify(ce)}`);
  if (role) parts.push(`role=${role}`);
  return parts.join(" ");
}

/** Shadow DOM retargets `focusin.target` to the host; walk the real path. */
function resolveFocusFieldHost(event: FocusEvent): Element | null {
  const path = event.composedPath();
  for (const node of path) {
    if (!(node instanceof Element)) continue;
    const host = resolveFieldHost(node);
    if (host) return host;
  }
  return null;
}

type SaveNoteResult = { slug?: string; error?: string };

function sendSaveNote(text: string): Promise<SaveNoteResult> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { type: "SAVE_NOTE", payload: { text } },
      (response: SaveNoteResult | undefined) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(response ?? {});
      },
    );
  });
}

console.log(LOG_PREFIX, "content script loaded", {
  href: location.href,
  isTopFrame: window === window.top,
  readyState: document.readyState,
});

/** Avoid awaiting storage on every focusin; sync from listener + one-time prime. */
let floatingIconEnabledCache: boolean | null = null;

void chrome.storage.local.get(FLOATING_ICON_ENABLED_KEY).then((data) => {
  floatingIconEnabledCache = data[FLOATING_ICON_ENABLED_KEY] !== false;
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") return;
  const ch = changes[FLOATING_ICON_ENABLED_KEY];
  if (!ch) return;
  floatingIconEnabledCache = ch.newValue !== false;
  if (ch.newValue === false) {
    removeFloatingIcon();
  }
});

document.addEventListener(
  "focusout",
  () => {
    dismissIconIfFocusMovedAway();
  },
  true,
);

document.addEventListener(
  "focusin",
  async (event) => {
    if (floatingIconEnabledCache === null) {
      const data = await chrome.storage.local.get(FLOATING_ICON_ENABLED_KEY);
      floatingIconEnabledCache = data[FLOATING_ICON_ENABLED_KEY] !== false;
    }
    if (!floatingIconEnabledCache) {
      return;
    }

    const host = resolveFocusFieldHost(event);
    const path = event.composedPath();
    const pathElements = path.filter((n): n is Element => n instanceof Element);
    const pathSummary = pathElements.slice(0, 10).map(summarizeNode).join(" ← ");

    if (!host) {
      console.log(LOG_PREFIX, "focusin: no field host", {
        eventTarget: summarizeNode(event.target),
        pathPreview: pathSummary,
        pathLen: path.length,
      });
      return;
    }

    console.log(LOG_PREFIX, "focusin: show save icon", {
      host: summarizeNode(host),
      pathPreview: pathSummary,
    });

    attachIcon(host, async () => {
      const text = getText(host).trim();
      if (!text) {
        showToast("Nothing to save.");
        return;
      }

      setIconLoading(true);
      try {
        let url: string;
        try {
          const res = await sendSaveNote(text);
          if (res.error) {
            showToast(res.error);
            return;
          }
          if (!res.slug) {
            showToast("Could not save — no slug returned.");
            return;
          }
          url = buildShareUrl(res.slug);
        } catch {
          showToast("Could not save — try again.");
          return;
        }

        try {
          await navigator.clipboard.writeText(url);
        } catch {
          showToast("Saved, but clipboard copy failed.");
          return;
        }

        showToast("Saved to getsecret + link copied");
      } finally {
        setIconLoading(false);
      }
    });
  },
  true,
);
