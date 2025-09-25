export class StyleInjector {
  private static injected = false;

  static ensure(
    processedClass: string,
    conflictedClass: string,
    updatedClass: string,
  ) {
    if (this.injected) return;
    const css = `
      .${processedClass} {
        outline: 1px #b3e4d2 solid; outline-offset: -1px;
        transition: outline-color .2s ease-in-out;
      }
      .${processedClass}.${conflictedClass} {
        outline-color: #f39aa0;
      }
      .${processedClass}.${updatedClass} {
        outline-color: #9abcf3;
      }
    `;
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
    this.injected = true;
  }
}
