import {SlatePlugin} from '@udecode/slate-plugins'
import {onKeyDownHierarchy} from './onKeyDownHierarchy'

export const HierarchyPlugin = (): SlatePlugin => ({
  onKeyDown: onKeyDownHierarchy(),
})
