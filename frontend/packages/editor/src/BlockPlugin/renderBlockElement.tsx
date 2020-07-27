import {getRenderElement} from '@udecode/slate-plugins'
import {nodeTypes} from '../nodeTypes'
import {EditableBlock, ReadOnlyBlock} from './block'

export function renderEditableBlockElement() {
  return getRenderElement({
    type: nodeTypes.typeBlock,
    component: EditableBlock,
    rootProps: {},
  })
}

export function renderReadOnlyBlockElement() {
  return getRenderElement({
    type: nodeTypes.typeBlock,
    component: ReadOnlyBlock,
    rootProps: {},
  })
}
