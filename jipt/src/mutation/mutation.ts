import styles from '../ui/styles';
import LiveNode from './live-node';
import ViewportGate from './viewport-gate';

const NODE_UPDATE_STYLE_TIMEOUT = 600;

// Only these attributes get translated (keep this strict)
const TRANSLATABLE_ATTRS = ['title', 'alt', 'placeholder', 'aria-label'];
const PROCESSED_ATTR = 'data-jipt-processed';
const IGNORE_SELECTOR = '[data-accent-ignore]';

interface Translation {
  isConflicted: boolean;
}

/*
  The Mutation component listens to DOM changes and is responsible of updating parent
  window nodes on mutation and messages FROM the Accent client.
*/
export default class Mutation {
  private readonly liveNode: LiveNode;

  private rafHandle: number | null = null;
  private readonly queuedRoots = new Set<Element>();
  private readonly processed = new WeakSet<Node>();
  private readonly gate: ViewportGate;

  constructor(liveNode: LiveNode) {
    this.liveNode = liveNode;

    this.gate = new ViewportGate((el) => this.translateVisibleElement(el));
  }

  static nodeChange(node: HTMLElement, meta: any, text: string) {
    this.textNodeChange(node, meta, text);
    this.attributeNodeChange(node, meta, text);
  }

  static nodeStyleRefresh(node: HTMLElement, translation: Translation) {
    node.removeAttribute('class');

    if (translation.isConflicted) {
      styles.set(node, styles.translationNodeConflicted);
    } else {
      styles.set(node, styles.translationNode);
    }
  }

  private static textNodeChange(node: HTMLElement, meta: any, text: string) {
    if (node.innerHTML === text) return;
    let updatedText = text;

    if (text.trim() === '') updatedText = '–';

    node.innerHTML = updatedText;

    if (!meta.head) this.handleUpdatedNodeStyles(node);
  }

  private static attributeNodeChange(
    node: HTMLElement,
    meta: any,
    text: string,
  ) {
    if (!meta.attributeName) return;
    if (node.getAttribute(meta.attributeName) === text) return;

    node.setAttribute(meta.attributeName, text);
    this.handleUpdatedNodeStyles(node);
  }

  private static handleUpdatedNodeStyles(node: Element) {
    const originalStyles = node.getAttribute('style');

    styles.set(node, styles.translationNodeUpdated);
    setTimeout(() => {
      styles.set(node, originalStyles);
    }, NODE_UPDATE_STYLE_TIMEOUT);
  }

  bindEvents() {
    // MutationObserver stays, but we’ll only *enqueue* added/changed subtrees
    const mo = new (window as any).MutationObserver(
      (mutations: MutationRecord[]) => {
        for (const m of mutations) {
          if (m.type === 'childList') {
            m.addedNodes.forEach((n) => {
              if (n.nodeType === Node.ELEMENT_NODE)
                this.scheduleScan(n as Element);
            });
          } else if (m.type === 'characterData') {
            const el = (m.target as CharacterData).parentElement;
            if (el) this.scheduleScan(el);
          } else if (m.type === 'attributes') {
            if (m.target && m.target.nodeType === Node.ELEMENT_NODE) {
              this.scheduleScan(m.target as Element);
            }
          }
        }
      },
    );

    // Observe the whole document
    mo.observe(document.documentElement, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: TRANSLATABLE_ATTRS as string[],
    });

    // Initial pass limited to what's on screen
    this.scheduleScan(document.body);
  }

  // ============== new scanning strategy ==============

  private scheduleScan(root: Element) {
    // Don’t scan ignored subtrees
    if (root.closest(IGNORE_SELECTOR)) return;

    this.queuedRoots.add(root);
    if (this.rafHandle != null) return;

    this.rafHandle = requestAnimationFrame(() => {
      const roots = Array.from(this.queuedRoots);
      this.queuedRoots.clear();
      this.rafHandle = null;
      for (const r of roots) this.scanRoot(r);
    });
  }

  private scanRoot(root: Element) {
    // 1) Text nodes via TreeWalker
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (node: Node) => {
        // Skip if already processed
        if (this.processed.has(node)) return NodeFilter.FILTER_REJECT;
        const parent = (node as CharacterData).parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        if (parent.closest(IGNORE_SELECTOR)) return NodeFilter.FILTER_REJECT;

        // Reject empty/whitespace
        const value = (node as CharacterData).nodeValue || '';
        if (!value.trim()) return NodeFilter.FILTER_REJECT;

        // Only if parent is *currently rendered*
        if (!this.isVisible(parent)) return NodeFilter.FILTER_REJECT;

        return NodeFilter.FILTER_ACCEPT;
      },
    } as any);

    let n: Node | null;
    while ((n = walker.nextNode())) {
      const parent = (n as CharacterData).parentElement!;
      // Real work deferred until in viewport
      this.gate.observe(parent);
    }

    // 2) Attribute nodes (strict allowlist)
    const selector = TRANSLATABLE_ATTRS.map((a) => `[${a}]`).join(',');
    const elements = root.querySelectorAll(selector);

    elements.forEach((el) => {
      if (!(el instanceof HTMLElement)) return;
      if (el.closest(IGNORE_SELECTOR)) return;
      if (!this.isVisible(el)) return;
      if (el.hasAttribute(PROCESSED_ATTR)) return;
      this.gate.observe(el);
    });
  }

  private translateVisibleElement(el: Element) {
    if (!(el instanceof HTMLElement)) return;
    if (!this.isVisible(el)) return;

    // A) Text children
    for (const child of Array.from(el.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE && !this.processed.has(child)) {
        // Use existing LiveNode API
        this.liveNode.matchText(child);
        this.processed.add(child);
      }
    }

    // B) Attributes
    let attrTranslated = false;
    for (const attr of TRANSLATABLE_ATTRS) {
      if (el.hasAttribute(attr)) {
        this.liveNode.matchAttributes(el);
        attrTranslated = true;
      }
    }

    // C) Evaluate any new element nodes (same as before)
    this.liveNode.evaluate(el);

    // Mark to avoid rework unless content *actually* changes later
    if (attrTranslated || el.childNodes.length) {
      (el as HTMLElement).setAttribute(PROCESSED_ATTR, '1');
      this.processed.add(el);
    }
  }

  private isVisible(el: HTMLElement): boolean {
    // Quick bails
    const style = window.getComputedStyle(el);
    if (
      style.display === 'none' ||
      style.visibility === 'hidden' ||
      style.opacity === '0'
    )
      return false;

    const rect = el.getBoundingClientRect();
    // Must have size and intersect viewport by at least a pixel
    if (rect.width <= 0 || rect.height <= 0) return false;

    // Optional: consider offscreen as not visible (IO prefetch handles near-viewport)
    const vw = Math.max(
      document.documentElement.clientWidth,
      window.innerWidth || 0,
    );
    const vh = Math.max(
      document.documentElement.clientHeight,
      window.innerHeight || 0,
    );
    if (rect.bottom < 0 || rect.top > vh || rect.right < 0 || rect.left > vw)
      return false;

    return true;
  }

  // ============== keep this for direct calls ==============

  // Kept for compatibility; callers can still pass raw MutationRecords if needed
  handleNodeMutation(node: any) {
    if (node.nodeType === Node.TEXT_NODE) this.liveNode.matchText(node.target);
    if (node.type === 'childList') {
      node.addedNodes.forEach((added: Node) => {
        if (added.nodeType === Node.ELEMENT_NODE)
          this.scheduleScan(added as Element);
      });
    }
    if (node.type === 'attributes') this.scheduleScan(node.target as Element);
    if (node.type === 'characterData') {
      const el = (node.target as CharacterData).parentElement;
      if (el) this.scheduleScan(el);
    }
  }
}
