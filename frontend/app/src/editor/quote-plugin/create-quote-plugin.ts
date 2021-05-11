import {
    SlatePlugin,
    getVoidTypes,
    getSlatePluginTypes,
    getRenderElement,
  } from '@udecode/slate-plugins';
  import { createId } from '@utils/create-id';
  
  export const ELEMENT_QUOTE = 'quote';
  export const createQuotePlugin = (): SlatePlugin => ({
    pluginKeys: ELEMENT_QUOTE,
    inlineTypes: getSlatePluginTypes(ELEMENT_QUOTE),
    voidTypes: getSlatePluginTypes(ELEMENT_QUOTE),
    renderElement: getRenderElement(ELEMENT_QUOTE),
  });
  