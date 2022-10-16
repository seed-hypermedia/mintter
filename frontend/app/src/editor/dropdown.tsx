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
  cursor: 'pointer',

  '&:focus': {
    outline: 'none',
    backgroundColor: '$base-component-bg-normal',
    cursor: 'pointer',
  },

  '&[data-disabled]': {
    cursor: 'default',
    opacity: 0.5,
  },
  '&[data-highlighted]': {
    backgroundColor: '$primary-component-bg-normal',
    color: '$primary-text-low',
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

var RightSlot = styled('div', {
  marginLeft: 'auto',
  paddingLeft: 20,
  color: '$base-active',
  '[data-highlighted] > &': {color: '$primary-active'},
  '[data-disabled] &': {color: '$primary-component-bg-normal'},
})

export const Dropdown = {
  ...DropdownMenuPrimitive,
  Content: DropdownContent,
  Item: DropdownItem,
  Separator: StyledSeparator,
  RightSlot,
}

export var ElementDropdown = styled('button', {
  all: 'unset',
  zIndex: 10,
  padding: 0,
  blockSize: '1.2rem',
  inlineSize: '1.2rem',
  borderRadius: '$2',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  '&:hover': {
    cursor: 'pointer',
    backgroundColor: '$base-component-bg-normal',
  },
})
