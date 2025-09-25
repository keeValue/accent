import {Config} from '../interfaces/config';
import {DefaultApplierConfig} from './default-applier-config';
import {DefaultLiveNodeConfig} from './default-live-node-config';
import {DefaultResolverConfig} from './default-resolver-config';
import {DefaultScannerConfig} from './default-scanner-config';

export const DefaultConfig: Config = {
  origin: '',
  hideLoading: false,
  projectId: '',
  applierConfig: DefaultApplierConfig,
  resolverConfig: DefaultResolverConfig,
  scannerConfig: DefaultScannerConfig,
  liveNodeConfig: DefaultLiveNodeConfig,
};
