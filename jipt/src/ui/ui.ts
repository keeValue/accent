import {State} from '../state';
import randomClass from './random-class';
import styles from './styles';
import {
  PostMessagePayloads,
  SelectMultipleTranslationsPayload,
  SelectSingleTranslationPayload,
} from '../interfaces/accent-api';

const EXPAND_CLASS = randomClass();
const COLLAPSE_CLASS = randomClass();
const DISABLE_CLASS = randomClass();

/*
  The UI component is responsible of instanciating the Accent interface
  and the communication between the parent (the page that executes this script) and
  the embeded Accent client.

  All interactions from the parent window TO the Accent client go through here.
*/
export default class UI {
  private readonly state: State = State.getInstance();
  private readonly overlay: HTMLElement;
  private readonly editor: HTMLElement;
  private readonly frame: HTMLIFrameElement;
  private readonly expandButton: Element;
  private readonly collapseButton: Element;
  private readonly disableButton: Element;

  constructor(root: Element) {
    this.overlay = this.buildOverlay();
    this.editor = this.buildContainer();
    this.frame = this.buildFrame();

    this.editor.append(this.frame);
    root.append(this.editor);
    root.append(this.overlay);

    this.expandButton = this.editor.getElementsByClassName(EXPAND_CLASS)[0];
    this.collapseButton = this.editor.getElementsByClassName(COLLAPSE_CLASS)[0];
    this.disableButton = this.editor.getElementsByClassName(DISABLE_CLASS)[0];

    this.collapse();
  }

  bindEvents() {
    this.editor.addEventListener(
      'click',
      this.handleEditorToggle.bind(this),
      false,
    );
  }

  hideOverlay() {
    this.overlay.remove();
    styles.hide(this.disableButton);
  }

  showLogin() {
    styles.hide(this.expandButton);
    styles.set(this.editor, styles.frameCentered);
    styles.set(this.disableButton, styles.frameDisableButton);
  }

  postMessage(message: PostMessagePayloads) {
    this.frame.contentWindow!.postMessage(message, this.state.config.origin);
  }

  collapse() {
    styles.set(this.editor, styles.frameCollapsed);
    styles.hide(this.collapseButton);
    styles.set(this.expandButton, styles.frameExpandButton);
  }

  expand() {
    styles.set(this.editor, styles.frameExpanded);
    styles.hide(this.expandButton);
    styles.set(this.collapseButton, styles.frameCollapseButton);
  }

  handleEditorToggle(event: MouseEvent) {
    const target = event.target as HTMLElement;

    if (target === this.collapseButton) {
      return this.collapse();
    }

    if (target === this.expandButton) {
      return this.expand();
    }
  }

  selectTranslation(id: string) {
    this.expand();
    const payload: SelectSingleTranslationPayload = {
      jipt: true,
      selectId: id,
    };
    this.postMessage(payload);
  }

  selectTranslations(ids: string) {
    this.expand();
    const payload: SelectMultipleTranslationsPayload = {
      jipt: true,
      selectIds: ids,
    };
    this.postMessage(payload);
  }

  private buildOverlay() {
    const element = document.createElement('div');
    if (!this.state.config.hideLoading) styles.set(element, styles.overlay);

    return element;
  }

  private buildFrame() {
    const frame = document.createElement('iframe');
    const url = new URL(
      `app/projects/${this.state.config.projectId}/jipt`,
      this.state.config.origin,
    );
    url.searchParams.set('parent', window.location.origin);

    const rev = this.state.currentRevision;
    if (rev) url.searchParams.set('revisionId', rev);

    frame.src = url.toString();
    styles.set(frame, styles.frameWindow);

    return frame;
  }

  private buildContainer() {
    const element = document.createElement('div');
    element.innerHTML = `
      <div class="${DISABLE_CLASS}" style="${styles.frameDisableButton}">×</div>
      <div class="${EXPAND_CLASS}" style="${styles.frameExpandButton}"></div>
      <div class="${COLLAPSE_CLASS}" style="${styles.frameCollapseButton}">×</div>
    `;

    return element;
  }
}
