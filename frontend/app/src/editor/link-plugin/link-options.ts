import type {
  SlatePluginComponent,
  SlatePluginOptions,
} from '@udecode/slate-plugins-core';
import { ELEMENT_LINK } from './create-link-plugin';
import { LinkElement } from './link-element';

export type LinkOptions = {
  [ELEMENT_LINK]: SlatePluginOptions;
};
export const linkOptions: LinkOptions = {
  [ELEMENT_LINK]: {
    type: ELEMENT_LINK,
    component: LinkElement as SlatePluginComponent,
    defaultType: ELEMENT_LINK,
  },
};
