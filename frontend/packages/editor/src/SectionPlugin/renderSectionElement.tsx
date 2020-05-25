import {getRenderElement} from 'slate-plugins-next'
import {nodeTypes} from '../nodeTypes'
import Section from './section'

export function renderSectionElement() {
  return getRenderElement({
    type: nodeTypes.typeSection,
    component: Section,
  })
}
