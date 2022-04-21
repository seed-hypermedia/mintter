import {css, keyframes, styled} from '@app/stitches.config'
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'

const slideUpAndFade = keyframes({
  '0%': {opacity: 0, transform: 'translateY(2px)'},
  '100%': {opacity: 1, transform: 'translateY(0)'},
})

const slideRightAndFade = keyframes({
  '0%': {opacity: 0, transform: 'translateX(-2px)'},
  '100%': {opacity: 1, transform: 'translateX(0)'},
})

const slideDownAndFade = keyframes({
  '0%': {opacity: 0, transform: 'translateY(-2px)'},
  '100%': {opacity: 1, transform: 'translateY(0)'},
})

const slideLeftAndFade = keyframes({
  '0%': {opacity: 0, transform: 'translateX(2px)'},
  '100%': {opacity: 1, transform: 'translateX(0)'},
})

export const dropdownContentStyle = css({
  minWidth: 220,
  background: '$background-alt',
  boxShadow: '$menu',
})

export const dropdownItemStyle = css({
  display: 'flex',
  fontSize: '$2',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'start',
  fontFamily: '$default',
  gap: '$4',
  paddingVertical: '$3',
  paddingHorizontal: '$4',
  borderRadius: '$2',
  cursor: 'pointer',
  '&:focus': {
    outline: 'none',
    backgroundColor: '$background-neutral',
    cursor: 'pointer',
  },
  '&:disabled': {
    opacity: 0.5,
  },
})

const DropdownContent = styled(DropdownMenuPrimitive.Content, dropdownContentStyle)
const DropdownItem = styled(DropdownMenuPrimitive.Item, dropdownItemStyle)

const StyledSeparator = styled(DropdownMenuPrimitive.Separator, {})

export const Dropdown = {
  ...DropdownMenuPrimitive,
  Content: DropdownContent,
  Item: DropdownItem,
  Separator: StyledSeparator,
}

export var ElementDropdown = styled('button', {
  all: 'unset',
  padding: 0,
  width: 24,
  height: 24,
  borderRadius: '$2',
  backgroundColor: '$hover',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
})
