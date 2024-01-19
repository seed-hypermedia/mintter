import { Button, MoreHorizontal, Popover, Separator, YGroup } from '@mintter/ui'
import { FC } from 'react'
import { usePopoverState } from '../use-popover-state'
import { MenuItem } from './dropdown'

export type MenuItemType = {
  key: string
  label: string
  icon: FC
  onPress: () => void
}

export function OptionsDropdown({
  menuItems,
  hiddenUntilItemHover,
}: {
  menuItems: (MenuItemType | null)[]
  hiddenUntilItemHover?: boolean
  hover?: boolean
}) {
  const popoverState = usePopoverState()
  return (
    <Popover {...popoverState} placement="bottom-end">
      <Popover.Trigger asChild>
        <Button
          size="$1"
          circular
          data-trigger
          opacity={!popoverState.open && hiddenUntilItemHover ? 0 : 1}
          onPress={(e) => {
            // because we are nested in the outer button, we need to stop propagation or else onPress is triggered by parent button
            e.stopPropagation()
          }}
          $group-item-hover={{
            opacity: 1,
          }}
          icon={MoreHorizontal}
        />
      </Popover.Trigger>
      <Popover.Content
        padding={0}
        elevation="$2"
        enterStyle={{y: -10, opacity: 0}}
        exitStyle={{y: -10, opacity: 0}}
        elevate={true}
        animation={[
          'fast',
          {
            opacity: {
              overshootClamping: true,
            },
          },
        ]}
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
                    title={item.label}
                    icon={item.icon}
                  />
                </YGroup.Item>
              ),
          )}
        </YGroup>
      </Popover.Content>
    </Popover>
  )
}
