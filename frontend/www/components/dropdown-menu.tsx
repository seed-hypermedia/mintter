import React from 'react'
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'
import {styled} from 'shared/stitches.config'

export const Root = DropdownMenuPrimitive.Root
export const Trigger = DropdownMenuPrimitive.Trigger

const StyledContent = styled(DropdownMenuPrimitive.Content, {
  minWidth: 130,
  backgroundColor: 'white',
  borderRadius: 6,
  padding: 5,
  boxShadow: '0px 5px 15px -5px hsla(206,22%,7%,.15)',
})

const StyledArrow = styled(DropdownMenuPrimitive.Arrow, {
  fill: 'white',
})

export const Content = React.forwardRef(
  ({children, ...props}, forwardedRef) => {
    return (
      <StyledContent ref={forwardedRef} {...props}>
        {children}
        <StyledArrow />
      </StyledContent>
    )
  },
)
export const Label = DropdownMenuPrimitive.Label
export const Item = styled(DropdownMenuPrimitive.Item, {
  fontSize: 13,
  padding: '5px 10px',
  borderRadius: 3,
  cursor: 'default',
  '&:focus': {
    outline: 'none',
    backgroundColor: '$brandPrimary',
    color: 'white',
  },
})

export const Group = DropdownMenuPrimitive.Group
export const Separator = DropdownMenuPrimitive.Separator
