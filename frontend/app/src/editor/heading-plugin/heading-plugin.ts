import {
  HeadingPluginOptions,
  SlatePlugin,
  deserializeHeading,
} from '@udecode/slate-plugins';

export function HeadingPlugin(options?: HeadingPluginOptions): SlatePlugin {
  return {
    deserialize: deserializeHeading(options),
  };
}
