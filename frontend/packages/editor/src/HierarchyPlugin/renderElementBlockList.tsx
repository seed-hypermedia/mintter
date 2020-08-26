import {getRenderElement} from '@udecode/slate-plugins'

export function renderElementBlockList(options) {
  const {block_list} = options

  return getRenderElement(block_list)
}
