import {getRenderElement, setDefaults} from '@udecode/slate-plugins'
import {EditableBlock} from './components/editableBlock'
import {DEFAULTS_BLOCK} from './defaults'

export function renderEditableBlockElement(options?: any) {
  const {block} = setDefaults(options, DEFAULTS_BLOCK)

  return getRenderElement({
    ...block,
    component: EditableBlock,
  })
}
