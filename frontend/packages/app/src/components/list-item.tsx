import {Timestamp} from '@bufbuild/protobuf'
import {formattedDate} from '@mintter/shared'
import {
  Button,
  ButtonText,
  MoreHorizontal,
  Popover,
  Separator,
  YGroup,
} from '@mintter/ui'
import {FC, ReactElement} from 'react'
import {GestureResponderEvent} from 'react-native'
import {usePopoverState} from '../use-popover-state'
import {MenuItem} from './dropdown'

export type MenuItem = {
  key: string
  label: string
  icon: FC
  onPress: () => void
}

export function ListItem({
  accessory,
  title,
  onPress,
  onPointerEnter,
  menuItems = [],
}: {
  accessory: ReactElement
  title: string
  onPress: (e: GestureResponderEvent) => void
  onPointerEnter?: () => void
  menuItems?: MenuItem[]
}) {
  // const [isHovering, setIsHovering] = useState(false)
  const popoverState = usePopoverState()

  return (
    <>
      <Button
        onPointerEnter={onPointerEnter}
        // onPointerLeave={() => setIsHovering(false)}
        chromeless
        onPress={onPress}
      >
        <ButtonText
          onPress={onPress}
          fontWeight="700"
          flex={1}
          textAlign="left"
        >
          {title}
        </ButtonText>
        {accessory}
        <Popover {...popoverState} placement="bottom-end">
          <Popover.Trigger asChild>
            <Button
              size="$1"
              circular
              data-trigger
              onPress={(e) => {
                // because we are nested in the outer button, we need to stop propagation or else onPress is triggered by parent button
                e.stopPropagation()
              }}
              icon={MoreHorizontal}
            />
          </Popover.Trigger>
          <Popover.Content
            padding={0}
            elevation="$2"
            enterStyle={{y: -10, opacity: 0}}
            exitStyle={{y: -10, opacity: 0}}
            elevate
            animation={[
              'quick',
              {
                opacity: {
                  overshootClamping: true,
                },
              },
            ]}
          >
            <YGroup separator={<Separator />}>
              {menuItems.map((item) => (
                <YGroup.Item key={item.key}>
                  <MenuItem
                    onPress={(e) => {
                      e.stopPropagation()
                      popoverState.onOpenChange(false)
                      item.onPress()
                    }}
                    title={item.label}
                    icon={item.icon}
                  />
                </YGroup.Item>
              ))}
            </YGroup>
          </Popover.Content>
        </Popover>
      </Button>
    </>
  )
}

export function TimeAccessory({
  time,
  onPress,
}: {
  time: Timestamp | undefined
  onPress: (e: GestureResponderEvent) => void
}) {
  return (
    <ButtonText
      fontFamily="$body"
      fontSize="$2"
      data-testid="list-item-date"
      minWidth="10ch"
      textAlign="right"
      onPress={onPress}
    >
      {time ? formattedDate(time) : '...'}
    </ButtonText>
  )
}
