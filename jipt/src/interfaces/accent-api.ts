import {TranslationRecord} from './translation-record';

//#region Communication from accent-iframe -> parent

interface BaseIn {
  jipt: boolean;
  action: string;
}

interface ChangeText extends BaseIn {
  payload: {
    translationId: string;
    text: string;
  };
}

interface ListTranslations extends BaseIn {
  payload: {
    revisionId: string;
    translations: Record<string, TranslationRecord>;
  };
}

interface UpdateTranslation extends BaseIn {
  payload: {
    translationId: string;
    isConflicted: boolean;
  };
}

export type ChangeTextMessageEvent = MessageEvent<ChangeText>;
export type ListTranslationsMessageEvent = MessageEvent<ListTranslations>;
export type UpdateTranslationMessageEvent = MessageEvent<UpdateTranslation>;
export type AccentApiMessageEvents =
  | ChangeTextMessageEvent
  | ListTranslationsMessageEvent
  | UpdateTranslationMessageEvent;

//#endregion

//#region Communication from parent -> accent-iframe

interface BaseOut {
  jipt: boolean;
}

export interface RedirectIfEmbeddedPayload extends BaseOut {
  projectId: string;
}

export interface SelectSingleTranslationPayload extends BaseOut {
  selectId: string;
}

export interface SelectMultipleTranslationsPayload extends BaseOut {
  selectIds: string;
}

export type PostMessagePayloads =
  | RedirectIfEmbeddedPayload
  | SelectSingleTranslationPayload
  | SelectMultipleTranslationsPayload;

//#endregion
