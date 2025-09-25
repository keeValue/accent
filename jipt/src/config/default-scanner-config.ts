import {ScannerConfig} from '../interfaces/config';

export const DefaultScannerConfig: ScannerConfig = {
  ignoreSelectors: ['script', 'style', 'img', 'svg'],
  respectVisibility: true,
  skipAlreadyTranslated: true,
  markerRegex: /{\^(.+)}/,
  minTextLength: 10,
};
