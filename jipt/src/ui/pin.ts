import {ApplierConfig} from '../interfaces/config';
import {LiveNode} from '../mutation/live-node';
import {State} from '../state';
import styles from './styles';
import UI from './ui';

interface Props {
  ui: UI;
  root: Element;
}

const CENTER_OFFSET = 6;
const PIN_ATTRIBUTE = 'data-ids';

/*
  The Pin component serves as the entrypoint for the user. The element it creates
  is responsible to sending messages to the Accent UI.
*/
export default class Pin {
  private readonly element: HTMLDivElement;
  private readonly ui: UI;
  private readonly appliedAttribute =
    State.getInstance().config.applierConfig.idAttribute;
  private rafHandle = 0;
  private lastHostElement: HTMLElement | null = null;

  constructor(props: Props) {
    this.ui = props.ui;

    const pin = document.createElement('div');
    styles.hide(pin);
    props.root.append(pin);

    this.element = pin;
  }

  bindEvents() {
    this.element.addEventListener('click', (event) => {
      const element = (event.target as HTMLElement).closest(
        `[${PIN_ATTRIBUTE}]`,
      ) as HTMLElement | null;
      if (!element) return;

      const raw = element.getAttribute(PIN_ATTRIBUTE);
      if (!raw) return;

      if (raw.includes(',')) this.ui.selectTranslations(raw);
      else this.ui.selectTranslation(raw);

      styles.hide(this.element);
    });

    document.addEventListener('pointerover', (event) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      if (this.element.contains(target)) return;

      const host = target.closest<HTMLElement>(`[${this.appliedAttribute}]`);
      if (!host) return;

      if (this.lastHostElement === host) return;

      const ids = this.getIdsFor(host);
      if (ids.length === 0) {
        styles.hide(this.element);
        this.lastHostElement = null;
        return;
      }

      this.lastHostElement = host;
      this.showFor(host, ids);
    });

    document.addEventListener('pointerout', (event) => {
      const target = event.target as HTMLElement | null;
      const toEl = (event as PointerEvent).relatedTarget as HTMLElement | null;
      if (!target) return;

      const leavingHost = target.closest<HTMLElement>(
        `[${this.appliedAttribute}]`,
      );
      if (!leavingHost) return;

      if (toEl && leavingHost.contains(toEl)) return;

      if (toEl && this.element.contains(toEl)) return;

      styles.hide(this.element);
      this.lastHostElement = null;
    });

    window.addEventListener('scroll', () => styles.hide(this.element), {
      passive: true,
    });
    window.addEventListener('resize', () => styles.hide(this.element));
  }

  private getIdsFor(el: HTMLElement): string[] {
    const raw = el.getAttribute(this.appliedAttribute);
    if (!raw) return [];
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  private showFor(hostElement: HTMLElement, ids: string[]) {
    const {left, top, height} = hostElement.getBoundingClientRect();

    styles.set(
      this.element,
      `top:${top + height - CENTER_OFFSET}px;left:${left - CENTER_OFFSET}px;${styles.pin}`,
    );

    const idsAttr = ids.join(',');
    this.element.innerHTML = this.pinContent(`${PIN_ATTRIBUTE}="${idsAttr}"`);
    this.element.style.display = '';
  }

  private pinContent(id: string) {
    return `
       <div ${id} style="${styles.pinIcon}">
         <svg ${id} width="25px" height="25px" viewBox="0 0 36 36">
             <style>
                .jipt circle {
                  fill: #bb7c7a;
                  fill-opacity: 0.6;
                  stroke: black;
                  stroke-width: 3px;
                }
             </style>
             <g ${id} class="jipt" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
               <circle ${id} cx="18" cy="18" r="16"></circle>
               <path ${id} d="M14.1696451,26.1250371 L11.1975445,26.7239617 L11.1975445,26.7239617 C10.6561431,26.8330625 10.1288069,26.4826137 10.0197061,25.9412123 C9.99341156,25.8107285 9.99343152,25.6763082 10.0197648,25.5458323 L10.6195235,22.5741487 L10.6195235,22.5741487 C10.7287851,22.0327797 11.2562253,21.6824875 11.7975943,21.791749 C11.990561,21.8306944 12.1677406,21.9257281 12.3069277,22.0649396 L14.6792696,24.4376986 L14.6792696,24.4376986 C15.0697595,24.8282572 15.0697039,25.4614222 14.6791453,25.8519122 C14.5399046,25.9911284 14.3626638,26.0861409 14.1696451,26.1250371 Z M13.0837185,20.8347429 L15.9160431,23.6675654 L15.9159809,23.6676275 C16.3064709,24.0581861 16.9396358,24.0582418 17.3301945,23.6677518 C17.3302152,23.6677311 17.3302359,23.6677104 17.3302566,23.6676897 L27.4577455,13.5400764 L27.4577455,13.5400764 C27.8482698,13.1495521 27.8482698,12.5163872 27.4577455,12.1258629 L24.6247987,9.29291609 L24.6248216,9.29289322 C24.2342973,8.90236893 23.6011323,8.90236893 23.2106081,9.29289322 C23.2106004,9.29290084 23.2105928,9.29290847 23.2105852,9.29291609 L13.0837578,19.4204443 L13.0838428,19.4205293 C12.6933644,19.811033 12.6933468,20.4441324 13.0838035,20.8346579 Z" fill="#000000" fill-rule="nonzero"></path>
             </g>
         </svg>
       </div>
    `;
  }
}
