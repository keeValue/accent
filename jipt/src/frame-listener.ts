import {
  AccentApiMessageEvents,
  ChangeTextMessageEvent,
  ListTranslationsMessageEvent,
  RedirectIfEmbeddedPayload,
  UpdateTranslationMessageEvent,
} from './interfaces/accent-api';
import {LiveNode} from './mutation/live-node';
import {State} from './state';
import UI from './ui/ui';

const enum ACTIONS {
  UPDATE_TRANSLATION = 'updateTranslation',
  LIST_TRANSLATIONS = 'listTranslations',
  REDIRECT_EMBEDDED = 'redirectIfEmbedded',
  LOGIN = 'login',
  LOGGED_IN = 'loggedIn',
  CHANGE_TEXT = 'changeText',
}

export class FrameListener {
  private readonly _state: State;
  private _liveNode: LiveNode;

  constructor(private readonly _ui: UI) {
    this._state = State.getInstance();
    this._liveNode = new LiveNode();
  }

  bindEvents() {
    window.addEventListener('message', (event: AccentApiMessageEvents) => {
      if (event.origin !== this._state.config.origin) return;
      if (!event.data.jipt) return;

      switch (event.data.action) {
        case ACTIONS.LOGIN:
          this._ui.showLogin();
          break;
        case ACTIONS.LOGGED_IN:
          this._ui.collapse();
          break;
        case ACTIONS.REDIRECT_EMBEDDED:
          const payload: RedirectIfEmbeddedPayload = {
            jipt: true,
            projectId: this._state.config.projectId,
          };
          this._ui.postMessage(payload);
          break;
        case ACTIONS.LIST_TRANSLATIONS:
          this.handleListTranslations(event as ListTranslationsMessageEvent);
          break;
        case ACTIONS.UPDATE_TRANSLATION:
          this.handleUpdateTranslation(event as UpdateTranslationMessageEvent);
          break;
        case ACTIONS.CHANGE_TEXT:
          this.handleChangeText(event as ChangeTextMessageEvent);
          break;
        default:
          console.error('Action not found.', event.data);
          break;
      }
    });
  }

  private handleListTranslations(event: ListTranslationsMessageEvent) {
    console.log('LIST TRANSLATE', event);
    const {revisionId, translations} = event.data.payload;
    const currentRevision = this._state.currentRevision;

    this._state.setTranslations(revisionId, translations);
    if (!currentRevision || currentRevision === revisionId) {
      this._ui.hideOverlay();
      this._liveNode.evaluate(document.body);
      this._liveNode.observe(document.body);
      return;
    }
    this._liveNode.reset();
    this._ui.hideOverlay();
    this._liveNode.evaluate(document.body);
    this._liveNode.observe(document.body);
  }

  private handleUpdateTranslation(event: UpdateTranslationMessageEvent) {
    console.log('UPDATE TRANSLATION', event);
    const {translationId, isConflicted} = event.data.payload;
    const record = this._state.getTranslationById(translationId);
    if (!record) return;
    this._liveNode.applyRecordToAllNodes({...record, isConflicted});
  }

  private handleChangeText(event: ChangeTextMessageEvent) {
    console.log('CHANGE TEXT', event);
    const {translationId, text} = event.data.payload;
    const record = this._state.getTranslationById(translationId);
    if (!record) return;
    this._liveNode.applyRecordToAllNodes({...record, text});
  }
}
