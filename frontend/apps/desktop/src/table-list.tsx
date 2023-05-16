import {
  YStack,
  XStack,
  SizableText,
  ListItem,
  XStackProps,
  ListItemProps,
} from '@mintter/ui'
import {ComponentProps, PropsWithChildren, ReactNode} from 'react'

TableList.Header = TableHeader
TableList.Item = TableItem

export function TableList({
  children,
  ...props
}: {children: ReactNode} & ComponentProps<typeof YStack>) {
  return (
    <YStack
      userSelect="none"
      hoverStyle={{
        cursor: 'default',
      }}
      borderWidth={1}
      borderColor="$borderColor"
      f={1}
      // aria-label={}
      // aria-labelledby={ariaLabelledBy}
      br="$4"
      ov="hidden"
      mx="$-4"
      $sm={{
        //@ts-ignore
        mx: 0,
      }}
      {...props}
    >
      {children}
    </YStack>
  )
}

function TableHeader({children, ...props}: PropsWithChildren<XStackProps>) {
  return (
    <XStack
      alignItems="center"
      //@ts-ignore
      py="$2"
      px="$4"
      backgroundColor="$borderColor"
      gap="$3"
      {...props}
    >
      {children}
    </XStack>
  )
}

function TableItem({children, ...props}: PropsWithChildren<ListItemProps>) {
  return (
    <ListItem {...props}>
      <XStack alignItems="flex-start" width="100%">
        {children}
      </XStack>
    </ListItem>
  )
}
