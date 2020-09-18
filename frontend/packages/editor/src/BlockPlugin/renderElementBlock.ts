import {getRenderElement, setDefaults} from '@udecode/slate-plugins'
import {DEFAULTS_BLOCK} from './defaults'
import {Block} from './components/block'
export const renderElementBlock = (options?: any) => {
  const {block} = setDefaults(options, DEFAULTS_BLOCK)

  return getRenderElement({
    ...block,
    component: Block,
  })
}
