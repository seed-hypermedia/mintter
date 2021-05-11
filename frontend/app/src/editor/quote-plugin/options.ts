import type { SlatePluginOptions } from '@udecode/slate-plugins-core';
import { ELEMENT_QUOTE } from './create-quote-plugin';
import { QuoteElement } from './quote-element';

export type QuoteOptions = {
  [ELEMENT_QUOTE]: SlatePluginOptions;
};

export const quoteOptions: QuoteOptions = {
  [ELEMENT_QUOTE]: {
    type: ELEMENT_QUOTE,
    component: QuoteElement,
    defaultType: ELEMENT_QUOTE,
    // TODO: deserialize
  },
};
