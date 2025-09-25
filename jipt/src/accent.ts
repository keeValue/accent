import {DefaultResolverConfig} from './config/default-resolver-config';
import {DefaultScannerConfig} from './config/default-scanner-config';
import {FrameListener} from './frame-listener';
import {Config} from './interfaces/config';
import {State} from './state';
import Pin from './ui/pin';
import {StyleInjector} from './ui/style-injector';
import UI from './ui/ui';

export class Accent {
  private static _instance: Accent | null = null;

  private constructor() {}

  static getInstance(): Accent {
    if (!this._instance) this._instance = new this();
    return this._instance;
  }

  static exists() {
    return !!this._instance;
  }

  static destroy() {
    this._instance = null;
  }

  init(config: Config) {
    const state = State.getInstance().init(config);
    const {processedClass, conflictedClass, updatedClass} =
      state.config.applierConfig;
    StyleInjector.ensure(processedClass, conflictedClass, updatedClass);

    const root = document.body;

    const ui = new UI(root);
    ui.bindEvents();

    const pin = new Pin({ui, root});
    pin.bindEvents();

    const frameListener = new FrameListener(ui);
    frameListener.bindEvents();
  }
}
