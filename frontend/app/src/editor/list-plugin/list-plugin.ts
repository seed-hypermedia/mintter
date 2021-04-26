import {
  SlatePlugin,
  deserializeList,
  ListPluginOptions,
  renderElementList,
  // getElementDeserializer,
  // onKeyDownList,
} from '@udecode/slate-plugins';

/**
 * Enables support for bulleted, numbered and to-do lists.
 */
export const ListPlugin = (options?: ListPluginOptions): SlatePlugin => ({
  renderElement: renderElementList(options),
  // deserialize: {
  //   element: getElementDeserializer({
  //     type: 'p',
  //     rules: [{nodeNames: 'LI'}],
  //     ...options?.li?.deserialize,
  //   }),
  // },
  deserialize: deserializeList(options),
  //   onKeyDown: onKeyDownList(options),
});
