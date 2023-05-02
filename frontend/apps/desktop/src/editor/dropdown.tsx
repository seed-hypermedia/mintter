import {
  ButtonProps,
  YStack,
  SizableText,
  SizableTextProps,
  ListItem,
} from '@mintter/ui'
import {Button} from '@mintter/ui'
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'
import {forwardRef} from 'react'

// export const dropdownContentStyle = css({
//   minWidth: 220,
//   background: '$base-background-subtle',
//   boxShadow: '$menu',
//   borderRadius: '$2',
//   overflow: 'hidden',
//   zIndex: '$max',
// })

const Content = ({children, ...props}: any) => {
  return (
    <DropdownMenuPrimitive.Content asChild {...props}>
      <YStack
        //@ts-ignore
        contentEditable={false}
        minWidth={220}
        elevation="$5"
        backgroundColor="$background"
        borderRadius="$3"
        overflow="hidden"
        zIndex="$max"
      >
        {children}
      </YStack>
    </DropdownMenuPrimitive.Content>
  )
}

var RightSlot = SizableText

export const ElementDropdown = forwardRef((props: ButtonProps, ref: any) => {
  return (
    <DropdownMenuPrimitive.Trigger asChild ref={ref}>
      <Button size="$2" {...props} />
    </DropdownMenuPrimitive.Trigger>
  )
})

function Label(props: SizableTextProps) {
  return (
    <DropdownMenuPrimitive.Label asChild>
      <SizableText
        outlineStyle="none"
        backgroundColor="$background"
        size="$2"
        paddingHorizontal="$4"
        outlineColor="transparent"
        {...props}
      />
    </DropdownMenuPrimitive.Label>
  )
}

function Item({children, title, icon, iconAfter, ...props}: any) {
  return (
    <DropdownMenuPrimitive.Item {...props}>
      <ListItem
        hoverTheme
        pressTheme
        focusTheme
        paddingVertical="$2"
        paddingHorizontal="$4"
        textAlign="left"
        outlineColor="transparent"
        space="$2"
        title={
          title ? <SizableText fontSize="600">{title}</SizableText> : undefined
        }
        icon={icon}
        iconAfter={iconAfter}
      >
        {children}
      </ListItem>
    </DropdownMenuPrimitive.Item>
  )
}

export const Dropdown = {
  ...DropdownMenuPrimitive,
  // Content,
  Trigger: ElementDropdown,
  Label,
  Content,
  // SubContent: DropdownSubContent,
  Item,
  // SubTrigger: DropdownSubTrigger,
  // Separator: StyledSeparator,
  RightSlot,
}

// export var ElementDropdown = styled('button', {
//   all: 'unset',
//   zIndex: 10,
//   padding: 0,
//   blockSize: '1.2rem',
//   inlineSize: '1.2rem',
//   borderRadius: '$2',
//   display: 'flex',
//   alignItems: 'center',
//   justifyContent: 'center',
//   '&:hover': {
//     cursor: 'pointer',
//     backgroundColor: '$base-component-bg-normal',
//   },
// })
