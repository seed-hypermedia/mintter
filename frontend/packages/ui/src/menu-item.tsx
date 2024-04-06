import {ListItem, ListItemProps, SizableText} from 'tamagui'

export function MenuItem({
  disabled,
  title,
  icon,
  iconAfter,
  children,
  ...props
}: ListItemProps) {
  return (
    <ListItem
      hoverTheme
      pressTheme
      size="$2"
      focusTheme
      paddingVertical="$2"
      paddingHorizontal="$4"
      textAlign="left"
      outlineColor="transparent"
      space="$2"
      opacity={disabled ? 0.5 : 1}
      userSelect="none"
      cursor={disabled ? 'not-allowed' : 'pointer'}
      title={
        title ? (
          <SizableText
            fontSize="$2"
            cursor={disabled ? 'not-allowed' : 'pointer'}
            userSelect="none"
          >
            {title}
          </SizableText>
        ) : undefined
      }
      icon={icon}
      iconAfter={iconAfter}
      {...props}
    >
      {children}
    </ListItem>
  )
}
