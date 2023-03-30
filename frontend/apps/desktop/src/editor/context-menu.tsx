import {styled} from '@app/stitches.config'
import * as ContextMenuPrimitive from '@radix-ui/react-context-menu'
import {dropdownContentStyle, dropdownItemStyle} from './dropdown'

const ContentStyled = styled(ContextMenuPrimitive.Content, dropdownContentStyle)

const ItemStyled = styled(ContextMenuPrimitive.Item, dropdownItemStyle)

export const ContextMenu = {
  ...ContextMenuPrimitive,
  Item: ItemStyled,
  Content: ContentStyled,
}
