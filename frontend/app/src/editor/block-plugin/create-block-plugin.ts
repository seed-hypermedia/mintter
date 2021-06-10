import {
  SlatePlugin,
  getRenderElement,
  withNodeId,
} from '@udecode/slate-plugins';
import { mock } from '@mintter/client';

export const ELEMENT_BLOCK = 'block';

export const createBlockPlugin = (): SlatePlugin => ({
  pluginKeys: [ELEMENT_BLOCK],
  renderElement: getRenderElement([ELEMENT_BLOCK]),
  withOverrides: withNodeId({
    idCreator: () => mock.createId(),
    allow: [ELEMENT_BLOCK],
  }),
});
