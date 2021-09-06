import {styled} from '@mintter/ui/stitches.config'
import * as ContextMenuDefault from '@radix-ui/react-context-menu'
import {dropdownItemStyle, dropdownContentStyle} from './dropdown'

const ContentStyled = styled(ContextMenuDefault.Content, dropdownContentStyle)

const ItemStyled = styled(ContextMenuDefault.Item, dropdownItemStyle)

export const ContextMenu = {
  ...ContextMenuDefault,
  Item: ItemStyled,
  Content: ContentStyled,
}
