import { Command, Flags, Interfaces, ux } from '@oclif/core';
import * as chalk from 'chalk';
import ConfigFetcher from './services/config';
import ProjectFetcher from './services/project-fetcher';
import { Project, ProjectViewer } from './types/project';
import { withMinDuration } from './utils/utils';

export default abstract class BaseCommand extends Command {
  projectConfig!: ConfigFetcher;
  project?: Project;
  viewer?: ProjectViewer;

  static flags: Interfaces.FlagInput = {
    config: Flags.string({
      char: 'c',
      default: 'accent.json',
      description: 'Path to the config file'
    }),

    'extra-header': Flags.string({
      char: 'H',
      description: 'Extra HTTP header(s) to inject (key=value). Can be repeated.',
      multiple: true,
      exclusive: ['extra-headers-json']
    }),

    'extra-headers-json': Flags.string({
      description: 'JSON object of headers to inject (e.g. \'{"X-Header":"v"}\')',
      exclusive: ['extra-header']
    })
  } as const;

  async init(): Promise<void> {
    await super.init();

    const { flags } = await this.parse(this.constructor as unknown as typeof BaseCommand)
    this.projectConfig = new ConfigFetcher(flags.config);

    // Build header map from flags/env
    const extraHeaders: Record<string, string> = {}

    // --extra-header key=value (repeatable)
    for (const h of flags['extra-header'] ?? []) {
      const idx = h.indexOf('=')
      if (idx <= 0) this.error(`Invalid --header "${h}". Use key=value`, { exit: 2 })
      const key = h.slice(0, idx).trim()
      const val = h.slice(idx + 1).trim()
      if (!key || !val) this.error(`Invalid --header "${h}". Use key=value`, { exit: 2 })
      extraHeaders[key] = val
    }

    // --extra-headers-json '{"K":"V"}'
    if (flags['extra-headers-json']) {
      try {
        const json = JSON.parse(flags['headers-json'])
        if (typeof json !== 'object' || json === null) throw new Error('not an object')
        for (const [k, v] of Object.entries(json)) extraHeaders[k] = String(v)
      } catch (e) {
        this.error(`--headers-json must be a JSON object: ${(e as Error).message}`, { exit: 2 })
      }
    }

    // Optional: also support env var (handy for CI)
    if (process.env.ACCENT_HEADERS_JSON) {
      try {
        const json = JSON.parse(process.env.ACCENT_HEADERS_JSON)
        for (const [k, v] of Object.entries(json)) extraHeaders[k] = String(v)
      } catch {
        this.warn('ACCENT_HEADERS_JSON is set but not valid JSON; ignoring')
      }
    }

    this.projectConfig.mergeHeaders(extraHeaders);

    // Fetch project from the GraphQL API.
    ux.action.start(chalk.white(`Fetch config in ${flags.config}`));

    const fetcher = new ProjectFetcher();
    const response = await withMinDuration(fetcher.fetch(this.projectConfig.config), 300);
    this.project = response.project;
    this.viewer = response;

    if (!this.project) this.error('Unable to fetch project');

    ux.action.stop(chalk.green(`${this.viewer.user.fullname} ✓`));

    if (this.projectConfig.warnings.length) {
      console.log('');
      console.log(chalk.yellow.bold('Warnings:'));
    }

    this.projectConfig.warnings.forEach((warning) =>
      console.log(chalk.yellow(warning))
    );
    console.log('');
  }

  async refreshProject() {
    const config = this.projectConfig.config;

    const fetcher = new ProjectFetcher();
    const response = await fetcher.fetch(config);
    this.project = response.project;
    this.viewer = response;
  }
}
