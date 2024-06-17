import {
  Button,
  MenuItem,
  MoreHorizontal,
  Popover,
  Separator,
  XStack,
  YGroup,
} from '@shm/ui'
import {FC} from 'react'
import {usePopoverState} from '../use-popover-state'

export type MenuItemType = {
  key: string
  label: string
  subLabel?: string
  icon: FC
  onPress: () => void
}

export function OptionsDropdown({
  menuItems,
  hiddenUntilItemHover,
  button,
}: {
  menuItems: (MenuItemType | null)[]
  hiddenUntilItemHover?: boolean
  hover?: boolean
  button?: JSX.Element
}) {
  const popoverState = usePopoverState()
  return (
    <XStack
      opacity={!popoverState.open && hiddenUntilItemHover ? 0 : 1}
      $group-item-hover={{
        opacity: 1,
      }}
    >
      <Popover {...popoverState} placement="bottom-end">
        <Popover.Trigger asChild>
          {button || (
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
          )}
        </Popover.Trigger>
        <Popover.Content
          padding={0}
          elevation="$2"
          animation={[
            'fast',
            {
              opacity: {
                overshootClamping: true,
              },
            },
          ]}
          enterStyle={{y: -10, opacity: 0}}
          exitStyle={{y: -10, opacity: 0}}
          elevate={true}
        >
          <YGroup separator={<Separator />}>
            {menuItems.map(
              (item) =>
                item && (
                  <YGroup.Item key={item.key}>
                    <MenuItem
                      onPress={(e) => {
                        e.stopPropagation()
                        popoverState.onOpenChange(false)
                        item.onPress()
                      }}
                      subTitle={item.subLabel}
                      title={item.label}
                      icon={item.icon}
                    />
                  </YGroup.Item>
                ),
            )}
          </YGroup>
        </Popover.Content>
      </Popover>
    </XStack>
  )
}
