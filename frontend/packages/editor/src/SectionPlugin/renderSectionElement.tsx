import {getRenderElement} from '@udecode/slate-plugins'
import {nodeTypes} from '../nodeTypes'
import {EditableSection, ReadOnlySection} from './section'

export function renderEditableSectionElement() {
  return getRenderElement({
    type: nodeTypes.typeSection,
    component: EditableSection,
  })
}

export function renderReadOnlySectionElement() {
  return getRenderElement({
    type: nodeTypes.typeSection,
    component: ReadOnlySection,
  })
}
