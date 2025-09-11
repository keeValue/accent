// jipt/src/mutation/viewport-gate.ts
type Callback = (el: Element) => void;

export default class ViewportGate {
  private readonly io: IntersectionObserver;
  private readonly pending = new WeakSet<Element>();

  constructor(cb: Callback, rootMargin = '200px') {
    this.io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const el = e.target as Element;
          this.io.unobserve(el);
          this.pending.delete(el);
          cb(el);
        }
      },
      {root: null, rootMargin, threshold: 0.01},
    );
  }

  observe(el: Element) {
    if (this.pending.has(el)) return;
    this.pending.add(el);
    this.io.observe(el);
  }

  disconnect() {
    this.io.disconnect();
  }
}
