import {TranslationRecord} from '../interfaces/translation-record';
import {State} from '../state';
import {Applier} from './applier';
import {Resolver} from './resolver';
import {Scanner} from './scanner';

export class LiveNode {
  private scanner: Scanner;
  private resolver: Resolver;
  private applier: Applier;
  private _state: State = State.getInstance();
  private readonly _config = this._state.config.liveNodeConfig;

  private mo?: MutationObserver;
  private pendingRoots = new Set<HTMLElement>();
  private scheduled = false;
  private debounceHandle: number | undefined;
  private lastEvaluatedAt = 0;

  constructor() {
    this.scanner = new Scanner();
    this.resolver = new Resolver();
    this.applier = new Applier();
  }

  static isLive(node: HTMLElement): boolean {
    const {processedClass} = State.getInstance().config.applierConfig;
    return node.classList.contains('.' + processedClass) !== null;
  }

  private disconnect() {
    if (this.mo) {
      this.mo?.disconnect();
      this.mo = undefined;
    }

    if (this.debounceHandle !== undefined) {
      clearTimeout(this.debounceHandle);
      this.debounceHandle = undefined;
    }

    this.pendingRoots.clear();
    this.scheduled = false;
  }

  reset() {
    this.disconnect();
    this.applier.unapplyAll();
  }

  evaluate(root: Element) {
    const candidates = this.scanner.scan(root);
    for (const candidate of candidates) {
      const records = this.resolver.resolve(candidate.keys);
      if (records.length === 0) continue;
      this.applier.apply(candidate.node, records, candidate.meta);
    }
    document.dispatchEvent(new Event('apply-pins'));
  }

  private flush() {
    if (this.pendingRoots.size === 0) return;

    const roots = Array.from(this.pendingRoots);
    this.pendingRoots.clear();

    for (const root of roots) {
      const candidates = this.scanner.scanSubtree(root);
      for (const candidate of candidates) {
        const records = this.resolver.resolve(candidate.keys);
        if (records.length === 0) continue;
        this.applier.apply(candidate.node, records, candidate.meta);
      }
    }

    this.lastEvaluatedAt = performance.now();
  }

  private scheduleFlush() {
    if (this.scheduled) return;
    const {debounceMs} = this._config;
    this.scheduled = true;

    this.debounceHandle = setTimeout(() => {
      this.scheduled = false;
      this.flush();
    }, debounceMs);
  }

  private collectRoot(node: Node) {
    const {ignoreSelectors} = this._state.config.scannerConfig;
    const element = node instanceof HTMLElement ? node : node.parentElement;
    if (!element) return;

    if (ignoreSelectors?.some((selector) => element.matches(selector))) return;

    for (const existing of Array.from(this.pendingRoots)) {
      if (existing.contains(element)) return;
      if (element.contains(existing)) this.pendingRoots.delete(existing);
    }
    this.pendingRoots.add(element);
  }

  private onMutations(records: MutationRecord[]) {
    const {
      processedClass,
      conflictedClass: conflictClass,
      idAttribute,
    } = this._state.config.applierConfig;

    for (const record of records) {
      if (
        record.type === 'attributes' &&
        record.target instanceof HTMLElement
      ) {
        if (record.attributeName === idAttribute) continue;

        const target = record.target as HTMLElement;
        if (
          record.attributeName === 'class' &&
          (target.classList.contains(processedClass) ||
            target.classList.contains(conflictClass ?? ''))
        )
          continue;
      }
      switch (record.type) {
        case 'childList':
          record.addedNodes.forEach((node) => this.collectRoot(node));
          if (record.target instanceof HTMLElement)
            this.collectRoot(record.target);
          break;
        case 'attributes':
        case 'characterData':
          if (record.target instanceof HTMLElement)
            this.collectRoot(record.target);
          break;
      }
    }

    this.scheduleFlush();
  }

  applyRecordToAllNodes(record: TranslationRecord): void {
    const nodes = this.applier.nodesFor(record.id);
    if (!nodes) return;
    for (const node of nodes) this.applier.apply(node, [record]);
  }

  observe(root: Element) {
    const {observeAttributes, observeChildList, observeCharacterData} =
      this._config;
    if (this.mo) this.disconnect();

    this.mo = new MutationObserver((records) => this.onMutations(records));
    this.mo.observe(root, {
      subtree: true,
      childList: observeChildList,
      attributes: observeAttributes,
      attributeOldValue: false,
      characterData: observeCharacterData,
      characterDataOldValue: false,
    });
  }
}
