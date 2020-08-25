import {SlatePlugin} from '@udecode/slate-plugins'
import {onKeyDownHierarchy} from './onKeyDownHierarchy'

export const HierarchyPlugin = (options: any): SlatePlugin => ({
  onKeyDown: onKeyDownHierarchy(options),
})
