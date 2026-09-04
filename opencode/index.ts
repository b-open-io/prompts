import { loadCatalog, applyCatalog } from './catalog.ts';
import { createHooks } from './hooks.ts';

// Imported by the one installer-owned entrypoint, never copied into a loader directory.
export function createBopenPlugin(roots: string[]) {
  return async (input: any) => {
    const catalog = loadCatalog(roots);
    for (const warning of catalog.warnings) {
      await input.client.app.log({body:{service:'bopen',level:'warn',message:warning}});
    }
    return {
      ...await createHooks(input, roots),
      config: async (config: any) => applyCatalog(config, catalog),
    };
  };
}
