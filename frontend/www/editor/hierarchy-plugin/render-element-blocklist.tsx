import {getRenderElement, setDefaults} from '@udecode/slate-plugins'
import {BlockList} from './components/blocklist'
import {DEFAULTS_BLOCKLIST} from './defaults'

export function renderElementBlockList(options?: any) {
  const {block_list} = setDefaults(options, DEFAULTS_BLOCKLIST)

  return getRenderElement({
    ...block_list,
    component: BlockList,
  })
}
