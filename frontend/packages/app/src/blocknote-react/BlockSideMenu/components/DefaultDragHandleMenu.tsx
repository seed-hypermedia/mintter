import {DragHandleMenu, DragHandleMenuProps} from './DragHandleMenu'
import {RemoveBlockButton} from './DefaultButtons/RemoveBlockButton'
import {BlockColorsButton} from './DefaultButtons/BlockColorsButton'
import {BlockSchema} from '@mintter/app/src/blocknote-core'

export const DefaultDragHandleMenu = <BSchema extends BlockSchema>(
  props: DragHandleMenuProps<BSchema>,
) => (
  <DragHandleMenu>
    <RemoveBlockButton {...props}>Delete</RemoveBlockButton>
    {/* <BlockColorsButton {...props}>Colors</BlockColorsButton> */}
  </DragHandleMenu>
)
