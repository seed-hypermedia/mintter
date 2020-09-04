import {getRenderElement} from '@udecode/slate-plugins'
import {EditableBlock} from './components/editableBlock'
import {ReadOnlyBlock} from './components/readOnlyBlock'

export const ELEMENT_BLOCK = 'block'

export const BLOCK_OPTIONS = {
  block: {
    type: ELEMENT_BLOCK,
  },
}

export function renderEditableBlockElement(options?: any) {
  const {block} = options
  return getRenderElement({
    ...block,
    component: EditableBlock,
  })
}

export function renderReadOnlyBlockElement(options?: any) {
  const {block} = options
  return getRenderElement({
    ...block,
    component: ReadOnlyBlock,
  })
}
