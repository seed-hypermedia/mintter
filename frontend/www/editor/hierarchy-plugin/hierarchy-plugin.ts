import {SlatePlugin} from '@udecode/slate-plugins'
import {onKeyDownHierarchy} from './on-keydown-hierarchy'
import {renderElementBlockList} from './render-element-blocklist'

export const HierarchyPlugin = (options: any): SlatePlugin => ({
  onKeyDown: onKeyDownHierarchy(options),
  renderElement: renderElementBlockList(options),
})
