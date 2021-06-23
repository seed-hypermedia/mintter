import {SlatePlugin, getRenderElement, withNodeId} from '@udecode/slate-plugins'
import * as mock from '@mintter/client/mocks'

export const ELEMENT_BLOCK = 'block'

export const createBlockPlugin = (): SlatePlugin => ({
  pluginKeys: [ELEMENT_BLOCK],
  renderElement: getRenderElement([ELEMENT_BLOCK]),
  withOverrides: withNodeId({
    idCreator: () => mock.createId(),
    allow: [ELEMENT_BLOCK],
  }),
})
