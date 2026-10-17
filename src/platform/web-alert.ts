import type { AlertButton, AlertOptions } from 'react-native';

type AlertRequest = { title: string; message?: string; buttons?: AlertButton[]; options?: AlertOptions };
const pending: AlertRequest[] = [];
let visible = false;

export function showWebAlert(title: string, message?: string, buttons?: AlertButton[], options?: AlertOptions) {
  pending.push({ title, message, buttons, options });
  presentNext();
}

function presentNext() {
  if (visible || !pending.length) return;
  const request = pending.shift()!;
  visible = true;
  const previousFocus = document.activeElement as HTMLElement | null;
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:#1f183066;display:flex;align-items:center;justify-content:center;padding:24px;box-sizing:border-box';
  const dialog = document.createElement('div');
  dialog.setAttribute('role', 'alertdialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', 'destiny-alert-title');
  dialog.style.cssText = 'width:100%;max-width:342px;max-height:85dvh;overflow:auto;background:white;border-radius:12px;padding:24px;box-sizing:border-box;font:15px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#1F1830';
  const title = document.createElement('h2');
  title.id = 'destiny-alert-title';
  title.textContent = request.title;
  title.style.cssText = 'margin:0 0 12px;font-size:20px;line-height:1.4;font-weight:600';
  dialog.append(title);
  if (request.message) {
    const message = document.createElement('p');
    message.id = 'destiny-alert-message';
    message.textContent = request.message;
    message.style.cssText = 'margin:0 0 20px;white-space:pre-wrap;overflow-wrap:anywhere';
    dialog.setAttribute('aria-describedby', message.id);
    dialog.append(message);
  }
  const actions = document.createElement('div');
  actions.style.cssText = 'display:flex;flex-wrap:wrap;justify-content:flex-end;gap:8px';
  const close = (button?: AlertButton, dismissed = false) => {
    document.removeEventListener('keydown', onKeyDown, true);
    overlay.remove();
    previousFocus?.focus();
    visible = false;
    try { if (dismissed) request.options?.onDismiss?.(); else button?.onPress?.(); }
    finally { presentNext(); }
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') { event.preventDefault(); if (request.options?.cancelable) close(undefined, true); }
    if (event.key !== 'Tab') return;
    const buttons = [...actions.querySelectorAll('button')];
    const first = buttons[0]; const last = buttons.at(-1);
    if (!dialog.contains(document.activeElement)) { event.preventDefault(); first?.focus(); }
    else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  };
  for (const button of request.buttons?.length ? request.buttons : [{ text: 'OK' }]) {
    const control = document.createElement('button');
    control.type = 'button';
    control.textContent = button.text ?? 'OK';
    control.style.cssText = `min-height:48px;min-width:72px;border:0;border-radius:10px;padding:12px 16px;font-family:inherit;font-weight:600;font-size:15px;cursor:pointer;background:${button.style === 'cancel' ? '#EEE5F7' : button.style === 'destructive' ? '#BA3547' : '#48217D'};color:${button.style === 'cancel' ? '#48217D' : '#fff'}`;
    control.onclick = () => close(button);
    actions.append(control);
  }
  overlay.addEventListener('click', event => { if (event.target === overlay && request.options?.cancelable) close(undefined, true); });
  dialog.append(actions); overlay.append(dialog); document.body.append(overlay);
  document.addEventListener('keydown', onKeyDown, true);
  actions.querySelector('button')?.focus();
}
