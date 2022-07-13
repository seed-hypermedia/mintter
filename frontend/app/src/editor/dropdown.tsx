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
  background: '$base-background-subtle',
  boxShadow: '$menu',
  borderRadius: '$2',
  overflow: 'hidden',
  userSelect: 'none',
})

export const dropdownItemStyle = css({
  userSelect: 'none',
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
  '&:disabled': {
    opacity: 0.5,
  },
})

const DropdownContent = styled(
  DropdownMenuPrimitive.Content,
  dropdownContentStyle,
)
const DropdownItem = styled(DropdownMenuPrimitive.Item, dropdownItemStyle)

const StyledSeparator = styled(DropdownMenuPrimitive.Separator, {})

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
  width: 18,
  height: 18,
  borderRadius: '$2',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  '&:hover': {
    cursor: 'pointer',
    backgroundColor: '$base-component-bg-normal',
  },
})
