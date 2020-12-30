import {SlatePlugin} from '@udecode/slate-plugins'
import {onKeyDownHierarchy} from './on-keydown-hierarchy'
import {renderElementBlockList} from './render-elementblocklist'

export const HierarchyPlugin = (options: any): SlatePlugin => ({
  onKeyDown: onKeyDownHierarchy(options),
  renderElement: renderElementBlockList(options),
})
