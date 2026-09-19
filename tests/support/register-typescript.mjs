import { registerHooks } from 'node:module';

// Metro and TypeScript resolve extensionless source imports; Node's type stripper
// needs the matching extension explicitly. Do not change production resolution.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (context.parentURL?.endsWith('.ts') && /^\.{1,2}\//.test(specifier)
      && !/\.[a-z]+$/i.test(specifier)) {
      return nextResolve(`${specifier}.ts`, context);
    }
    return nextResolve(specifier, context);
  },
});
