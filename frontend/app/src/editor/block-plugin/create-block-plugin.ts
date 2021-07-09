import {SlatePlugin, getRenderElement, withNodeId} from '@udecode/slate-plugins'
import * as mock from '@mintter/client/mocks'
import {createBlockElement} from './block-element'

export const ELEMENT_BLOCK = 'block'

export const createBlockPlugin = ({sidepanelSend}): SlatePlugin => ({
  pluginKeys: [ELEMENT_BLOCK],
  renderElement: createBlockElement({sidepanelSend}),
  withOverrides: withNodeId({
    idCreator: () => mock.createId(),
    allow: [ELEMENT_BLOCK],
  }),
})
