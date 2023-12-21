import {Timestamp} from '@bufbuild/protobuf'
import {formattedDate, formattedDateLong} from '@mintter/shared'
import {Button, ButtonProps, ButtonText, Link, Tooltip, View} from '@mintter/ui'
import {ComponentProps, ReactElement, useState} from 'react'
import {copyUrlToClipboardWithFeedback} from '../copy-to-clipboard'
import {MenuItemType, OptionsDropdown} from './options-dropdown'

export function ListItem({
  accessory,
  title,
  onPress,
  onPointerEnter,
  menuItems = [],
}: {
  accessory: ReactElement
  title: string
  onPress: ButtonProps['onPress'] | ComponentProps<typeof ButtonText>['onPress']
  onPointerEnter?: () => void
  menuItems?: (MenuItemType | null)[] | (() => (MenuItemType | null)[])
}) {
  const [currentMenuItems, setMenuItems] = useState(
    typeof menuItems === 'function' ? undefined : menuItems,
  )
  return (
    <Button
      onPointerEnter={() => {
        onPointerEnter?.()
        if (!currentMenuItems && typeof menuItems === 'function') {
          setMenuItems(menuItems())
        }
      }}
      // onPointerLeave={() => setIsHovering(false)}
      chromeless
      onPress={onPress}
      group="item"
      maxWidth={900}
      f={1}
    >
      <ButtonText
        onPress={(e) => {
          e.stopPropagation()
          onPress?.(e)
        }}
        fontWeight="700"
        flex={1}
        textAlign="left"
      >
        {title}
      </ButtonText>
      {accessory}
      {currentMenuItems ? (
        <OptionsDropdown hiddenUntilItemHover menuItems={currentMenuItems} />
      ) : (
        <View width={20} />
      )}
    </Button>
  )
}

export function copyLinkMenuItem(
  url: string | undefined | null,
  label: string,
): MenuItemType | null {
  if (!url) return null
  return {
    onPress: () => url && copyUrlToClipboardWithFeedback(url, label),
    key: 'copy-link',
    label: `Copy Link to ${label}`,
    icon: Link,
  }
}

export function TimeAccessory({
  time,
  onPress,
  tooltipLabel,
}: {
  time: Timestamp | undefined
  onPress: (e) => void
  tooltipLabel?: string
}) {
  return (
    <Tooltip
      content={
        tooltipLabel
          ? `${tooltipLabel} ${formattedDateLong(time)}`
          : formattedDateLong(time)
      }
    >
      <ButtonText
        fontFamily="$body"
        fontSize="$2"
        data-testid="list-item-date"
        onPress={onPress}
        // alignSelf="flex-end"
        minWidth={40}
        justifyContent="flex-end"
      >
        {time ? formattedDate(time) : '...'}
      </ButtonText>
    </Tooltip>
  )
}
