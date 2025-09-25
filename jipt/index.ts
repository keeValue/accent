import {Accent} from './src/accent';
import {Config} from './src/interfaces/config';

const ACCENT_INIT = 'accent:init';
const ACCENT_READY = 'accent:ready';
const ACCENT_DESTROY = 'accent:destroy';

type InitDetail = CustomEvent<Config>;

document.addEventListener(ACCENT_INIT, (e: Event) => {
  if (Accent.exists()) return;
  const config = (e as InitDetail).detail;
  Accent.getInstance().init(config);
});

document.addEventListener(ACCENT_DESTROY, (_: Event) => {
  if (!Accent.exists) return;
  Accent.destroy();
});

document.dispatchEvent(new Event(ACCENT_READY));
