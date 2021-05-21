import {
  SlatePlugin,
  getParagraphDeserialize,
  getRenderElement,
  ELEMENT_PARAGRAPH,
  withNodeId,
} from '@udecode/slate-plugins';
import { createId } from '@utils/create-id';

export const ELEMENT_BLOCK = 'block';

export const createBlockPlugin = (): SlatePlugin => ({
  pluginKeys: [ELEMENT_BLOCK],
  renderElement: getRenderElement([ELEMENT_BLOCK]),
  withOverrides: withNodeId({
    idCreator: () => createId(),
    allow: [ELEMENT_BLOCK],
  }),
});
