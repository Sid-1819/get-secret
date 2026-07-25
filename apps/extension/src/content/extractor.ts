/** WhatsApp Web and others use `plaintext-only` or legacy `contenteditable=""`. */
export function closestContentEditableHost(el: Element): HTMLElement | null {
  return el.closest<HTMLElement>(
    '[contenteditable="true"], [contenteditable="plaintext-only"], [contenteditable=""]',
  );
}

export function getText(element: Element): string {
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    return element.value;
  }
  const editable = closestContentEditableHost(element);
  if (editable) {
    return editable.innerText;
  }
  return "";
}
