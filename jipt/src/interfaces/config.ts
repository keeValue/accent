export type ScannerConfig = {
  ignoreSelectors?: string[]; // e.g. [ 'script', 'style', '[data-jipt-ignore]', '.no-translate']
  maxDepth?: number;
  respectVisibility?: boolean; // skip invisible if true
  skipAlreadyTranslated?: boolean; // skip nodes marked by Applier

  // Key extraction modes
  dataKeyAttr?: string; // e.g. 'data-i18n-key'
  markerRegex: RegExp; // e.g. /{\^(.+)}/

  minTextLength?: number;
};

export type ResolverConfig = {
  inputMode: 'key' | 'id';
  fallbackText?: 'key' | 'empty' | 'none';
  normalize?: (text: string) => string;
};

export type ApplierConfig = {
  multiKeyPolicy: 'first' | 'concat';
  concatSeparator?: string;
  processedClass: string;
  conflictedClass: string;
  updatedClass: string;
  idAttribute: string;
};

export type LiveNodeConfig = {
  debounceMs: number;
  observeAttributes: boolean;
  observeCharacterData?: boolean;
  observeChildList?: boolean;
};

export interface Config {
  projectId: string; // Project ID
  origin: string; // Accent URL
  hideLoading: boolean; // Hide black screen overlay on script loading, default: false
  scannerConfig: ScannerConfig; // Override the default Scanner config
  resolverConfig: ResolverConfig; // Override the default Resolver config
  applierConfig: ApplierConfig; // Override the default Applier config
  liveNodeConfig: LiveNodeConfig; // Override the default LiveNode config
}
