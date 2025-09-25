import {DefaultApplierConfig} from './config/default-applier-config';
import {DefaultConfig} from './config/default-config';
import {DefaultLiveNodeConfig} from './config/default-live-node-config';
import {DefaultResolverConfig} from './config/default-resolver-config';
import {DefaultScannerConfig} from './config/default-scanner-config';
import {Config} from './interfaces/config';
import {TranslationRecord} from './interfaces/translation-record';

export class State {
  private static _instance: State;
  private _translations: Map<string, TranslationRecord> = new Map();
  private _currentRevision: string = '';
  private _config: Config = DefaultConfig;

  private constructor() {}

  static getInstance(): State {
    if (!this._instance) this._instance = new this();
    return this._instance;
  }

  init(config: Config): State {
    this._config = config;
    this._config.scannerConfig =
      this._config.scannerConfig ?? DefaultScannerConfig;
    this._config.resolverConfig =
      this._config.resolverConfig ?? DefaultResolverConfig;
    this._config.applierConfig =
      this._config.applierConfig ?? DefaultApplierConfig;
    this._config.liveNodeConfig =
      this._config.liveNodeConfig ?? DefaultLiveNodeConfig;
    return this;
  }

  get translations() {
    return this._translations;
  }

  get currentRevision() {
    return this._currentRevision;
  }

  set currentRevision(value: string) {
    this._currentRevision = value;
  }

  get config() {
    return this._config;
  }

  setTranslations(revision: string, dict: Record<string, TranslationRecord>) {
    this._currentRevision = revision;

    this._translations.clear();
    for (const [key, rec] of Object.entries(dict)) {
      this._translations.set(key, rec);
    }
  }

  updateTranslation(record: TranslationRecord) {
    this._translations.set(record.key, record);
  }

  getTranslationById(id: string): TranslationRecord | null {
    for (const record of this._translations) {
      if (record[1].id === id) return record[1];
    }
    return null;
  }

  getTranslationByKey(key: string): TranslationRecord | null {
    return this._translations.get(key) ?? null;
  }
}
