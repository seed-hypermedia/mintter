import {Node} from 'slate'
import {setDefaults} from '@udecode/slate-plugins'
import {DEFAULTS_BLOCKLIST} from '../../HierarchyPlugin/defaults'

export const isNodeTypeBlockList = (node: Node, options?: any) => {
  const {block_list} = setDefaults(options, DEFAULTS_BLOCKLIST)

  return [block_list.type].includes(node.type as string)
}
