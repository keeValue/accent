import {ResolverConfig} from '../interfaces/config';
import {TranslationRecord} from '../interfaces/translation-record';
import {State} from '../state';

export class Resolver {
  private _state: State = State.getInstance();
  private readonly _config: ResolverConfig = this._state.config.resolverConfig;
  constructor() {}

  private lookup(raw: string): TranslationRecord | null {
    const mode = this._config.inputMode;

    if (mode === 'id') return this._state.getTranslationById(raw);
    return this._state.getTranslationByKey(raw);
  }

  private postProcess(record: TranslationRecord): TranslationRecord {
    let text = record.text;
    if (this._config.normalize) text = this._config.normalize(text);
    return {...record, text};
  }

  private handleMissing(key: string): TranslationRecord {
    const text =
      this._config.fallbackText === 'key'
        ? key
        : this._config.fallbackText === 'empty'
          ? ' - '
          : key;

    return {
      id: `__missing:${key}`,
      key: key,
      text,
      isConflicted: false,
    } as TranslationRecord & {__missing?: true};
  }

  resolve(keys: Iterable<string>): TranslationRecord[] {
    const seen = new Set<string>();
    const out: TranslationRecord[] = [];
    for (const key of keys) {
      if (seen.has(key)) continue;
      seen.add(key);
      const record = this.lookup(key);
      if (record) {
        out.push(this.postProcess(record));
        continue;
      }

      if (this._config.fallbackText === 'none') continue;
      out.push(this.handleMissing(key));
    }
    return out;
  }

  resolveBatch(keySets: Iterable<Iterable<string>>): TranslationRecord[][] {
    const result: TranslationRecord[][] = [];
    for (const set of keySets) result.push(this.resolve(set));
    return result;
  }
}
