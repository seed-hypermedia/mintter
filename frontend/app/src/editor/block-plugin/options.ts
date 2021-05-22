import type {
  SlatePluginComponent,
  SlatePluginOptions,
} from '@udecode/slate-plugins-core';
import { BlockElement } from './block-element';
import { ELEMENT_BLOCK } from './create-block-plugin';

export type BlockOptions = {
  [ELEMENT_BLOCK]: SlatePluginOptions;
};

export const blockOptions: BlockOptions = {
  [ELEMENT_BLOCK]: {
    type: ELEMENT_BLOCK,
    component: BlockElement as SlatePluginComponent,
    defaultType: ELEMENT_BLOCK,
    // TODO: deserialize
  },
};
