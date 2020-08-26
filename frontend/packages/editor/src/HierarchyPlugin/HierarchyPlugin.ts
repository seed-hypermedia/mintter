import {SlatePlugin} from '@udecode/slate-plugins'
import {onKeyDownHierarchy} from './onKeyDownHierarchy'
import {renderElementBlockList} from './renderElementBlockList'

export const HierarchyPlugin = (options: any): SlatePlugin => ({
  onKeyDown: onKeyDownHierarchy(options),
  renderElement: renderElementBlockList(options),
})
