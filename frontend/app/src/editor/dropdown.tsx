import {css, styled} from '@app/stitches.config'
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'

export const dropdownContentStyle = css({
  minWidth: 220,
  background: '$base-background-subtle',
  boxShadow: '$menu',
  borderRadius: '$2',
  overflow: 'hidden',
})

export const dropdownItemStyle = css({
  display: 'flex',
  fontSize: '$2',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'start',
  fontFamily: '$base',
  gap: '$4',
  paddingVertical: '$3',
  paddingHorizontal: '$4',
  borderRadius: '$2',
  '&[data-disabled]': {
    cursor: 'default',
  },
  cursor: 'pointer',
  '&:focus': {
    outline: 'none',
    backgroundColor: '$base-component-bg-normal',
    cursor: 'pointer',
  },
  '&:disabled': {
    opacity: 0.5,
  },
})

export var dropdownLabel = css({
  userSelect: 'none',
})

const DropdownContent = styled(
  DropdownMenuPrimitive.Content,
  dropdownContentStyle,
)
const DropdownItem = styled(DropdownMenuPrimitive.Item, dropdownItemStyle)

const StyledSeparator = styled(DropdownMenuPrimitive.Separator, {
  height: 1,
  backgroundColor: '$base-border-subtle',
  margin: '0.5rem',
})

export const Dropdown = {
  ...DropdownMenuPrimitive,
  Content: DropdownContent,
  Item: DropdownItem,
  Separator: StyledSeparator,
}

export var ElementDropdown = styled('button', {
  userSelect: 'none',
  all: 'unset',
  padding: 0,
  blockSize: '1rem',
  inlineSize: '1rem',
  borderRadius: '$2',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  '&:hover': {
    cursor: 'pointer',
    backgroundColor: '$base-component-bg-normal',
  },
})
