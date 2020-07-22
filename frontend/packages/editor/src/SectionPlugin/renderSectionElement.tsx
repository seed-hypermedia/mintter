import {getRenderElement} from '@udecode/slate-plugins'
import {nodeTypes} from '../nodeTypes'
import {EditableSection, ReadOnlySection} from './section'

export function renderEditableSectionElement() {
  return getRenderElement({
    type: nodeTypes.typeBlock,
    component: EditableSection,
    rootProps: {},
  })
}

export function renderReadOnlySectionElement() {
  return getRenderElement({
    type: nodeTypes.typeBlock,
    component: ReadOnlySection,
    rootProps: {},
  })
}
