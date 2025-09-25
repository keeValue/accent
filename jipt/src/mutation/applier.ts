import {TranslationRecord} from '../interfaces/translation-record';
import {State} from '../state';

export class Applier {
  private readonly _config = State.getInstance().config.applierConfig;
  private originals = new WeakMap<Node, {text?: string}>();
  private _refIndex: Map<string, Set<Node>> = new Map();
  private _nodeIndex: Map<Node, {keys: Set<string>; meta?: any}> = new Map();

  private computeTextAndIds(records: TranslationRecord[]) {
    const {multiKeyPolicy, concatSeparator} = this._config;
    const ids = records.map((r) => r.id);
    let text: string;

    switch (multiKeyPolicy) {
      case 'concat':
        text = records.map((r) => r.text).join(concatSeparator ?? ' ');
        break;
      case 'first':
      default:
        text = records[0]?.text ?? '';
        break;
    }
    return {text, ids};
  }

  private isSameAsCurrent(
    node: Node,
    parent: HTMLElement,
    text: string,
    ids: string[],
  ): boolean {
    const {idAttribute} = this._config;
    const currentIds = parent.getAttribute(idAttribute);
    const want = ids.join(',');
    const sameIds = (currentIds ?? '') === (want ?? '');
    const sameText = (node.textContent ?? '') === text;
    return sameIds && sameText;
  }

  private snapshotOriginal(parent: HTMLElement) {
    if (this.originals.has(parent)) return;
    this.originals.set(parent, {text: parent.textContent ?? ''});
  }

  private setNodeText(node: Node, text: string) {
    node.textContent = text;
  }

  private markElement(element: HTMLElement, ids: string[]) {
    const {processedClass, idAttribute} = this._config;
    const processed = processedClass;
    element.classList.add(processed);

    element.removeAttribute(idAttribute);
    element.setAttribute(idAttribute, ids.join(','));
  }

  private updateIndices(node: Node, records: TranslationRecord[], meta?: any) {
    const keys = new Set(records.map((r) => r.key));
    this._nodeIndex.set(node, {keys, meta});

    for (const r of records) {
      let set = this._refIndex.get(r.id);
      if (!set) this._refIndex.set(r.id, (set = new Set()));
      set.add(node);
    }
  }

  private applyConflictClass(
    element: HTMLElement,
    records: TranslationRecord[],
  ) {
    const {conflictedClass: conflictClass} = this._config;
    const conflict = records.some((r) => r.isConflicted);
    const cls = conflictClass ?? '';
    element.classList.toggle(cls, conflict);
  }

  nodesFor(id: string): Set<Node> | undefined {
    return this._refIndex.get(id);
  }

  apply(node: Node, records: TranslationRecord[], meta?: any) {
    if (records.length === 0) return;

    const {text, ids} = this.computeTextAndIds(records);
    const parent = node.parentElement;
    if (!parent) return;

    if (this.isSameAsCurrent(node, parent, text, ids)) {
      this.applyConflictClass(parent, records);
      return;
    }

    this.snapshotOriginal(parent);
    this.setNodeText(node, text);
    this.markElement(parent, ids);
    this.updateIndices(node, records, meta);
    this.applyConflictClass(parent, records);
  }

  private unapply(node: Node) {
    const {
      idAttribute,
      processedClass,
      conflictedClass: conflictClass,
    } = this._config;
    const original = this.originals.get(node);
    if (original) {
      node.textContent = original.text ?? '';
      this.originals.delete(node);
    }

    const parent = node.parentElement!;

    const rawIds = parent.getAttribute(idAttribute);
    parent.removeAttribute(idAttribute);

    parent.classList.remove(processedClass);
    parent.classList.remove(conflictClass ?? '');

    this._nodeIndex.delete(node);
    if (!rawIds) return;

    for (const id of rawIds
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)) {
      const set = this._refIndex.get(id);
      if (!set) continue;
      set.delete(node);
      if (set.size === 0) this._refIndex.delete(id);
    }
  }

  unapplyAll() {
    for (const node of this._nodeIndex.keys()) {
      const parent = node.parentElement;
      if (!parent) continue;
      this.unapply(parent);
    }
  }
}
