import {State} from '../state';

type TextNodeCandidate = {
  node: Node;
  keys: Set<string>;
  meta?: Record<string, any>;
};

export class Scanner {
  private readonly _state = State.getInstance();
  private readonly _config = this._state.config.scannerConfig;

  constructor() {}

  private isIgnored(element: Element): boolean {
    return (
      this._config.ignoreSelectors?.some((selector) =>
        element.matches(selector),
      ) ?? false
    );
  }

  private hasTranslatableText(node: Node): boolean {
    if (node.nodeType !== Node.TEXT_NODE) return false;
    return !!node.textContent && /\S/.test(node.textContent);
  }

  private createWalker(root: Element): TreeWalker {
    return document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (node: Node) => {
        const element = node.parentElement;
        if (!element) return NodeFilter.FILTER_REJECT;
        if (this.isIgnored(element)) return NodeFilter.FILTER_REJECT;

        if (
          this._config.skipAlreadyTranslated &&
          element.classList.contains(
            this._state.config.applierConfig.processedClass,
          )
        )
          return NodeFilter.FILTER_SKIP;

        if (!this.hasTranslatableText(node)) return NodeFilter.FILTER_SKIP;

        return NodeFilter.FILTER_ACCEPT;
      },
    });
  }

  private isVisible(element: HTMLElement): boolean {
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return false;
    const style = getComputedStyle(element);

    return (
      style.visibility !== 'hidden' &&
      style.display !== 'none' &&
      parseFloat(style.opacity || '1') > 0
    );
  }

  private keysFromDataAttr(element: HTMLElement, attribute?: string): string[] {
    if (!attribute) return [];
    const value = element.getAttribute(attribute);
    if (!value) return [];
    return value
      .split(',')
      .map((str) => str.trim())
      .filter(Boolean);
  }

  private keysFromMarker(text: string, pattern?: RegExp): string[] {
    if (!pattern) return [];
    const flags = pattern.flags.includes('g')
      ? pattern.flags
      : pattern.flags + 'g';
    const keys = new Set<string>();

    const regex = new RegExp(pattern.source, flags);
    let m: RegExpExecArray | null;
    while ((m = regex.exec(text))) keys.add(m[1]);
    return [...keys];
  }

  scan(root: Element): TextNodeCandidate[] {
    const out: TextNodeCandidate[] = [];
    const {markerRegex, dataKeyAttr, respectVisibility, minTextLength} =
      this._config;
    const walker = this.createWalker(root);
    let node: Text | null;

    while ((node = walker.nextNode() as Text | null)) {
      const keys = new Set<string>();
      const parent = node.parentElement;
      if (!parent) continue;

      this.keysFromDataAttr(parent, dataKeyAttr).forEach((k) => keys.add(k));

      if (node)
        this.keysFromMarker(node.textContent, markerRegex).forEach((k) =>
          keys.add(k),
        );

      if (keys.size === 0) continue;

      if (respectVisibility && !this.isVisible(parent)) continue;

      if (
        minTextLength &&
        (node.textContent || '').trim().length < minTextLength
      )
        continue;

      out.push({node, keys, meta: {source: 'scanner'}});
    }
    return out;
  }

  scanSubtree(root: Element): TextNodeCandidate[] {
    return this.scan(root);
  }
}
