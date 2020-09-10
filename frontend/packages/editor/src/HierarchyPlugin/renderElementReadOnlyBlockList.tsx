import {getRenderElement, setDefaults} from '@udecode/slate-plugins'
import {ReadOnlyBlockList} from './components'
import {DEFAULTS_BLOCKLIST} from './defaults'

export function renderElementReadOnlyBlockList(options?: any) {
  const {block_list} = setDefaults(options, DEFAULTS_BLOCKLIST)

  return getRenderElement({
    ...block_list,
    component: ReadOnlyBlockList,
  })
}
