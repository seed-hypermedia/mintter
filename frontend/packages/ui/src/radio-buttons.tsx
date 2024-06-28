import { ComponentProps } from 'react'
import { Button, XGroup } from 'tamagui'

export function RadioButtons<
  Options extends ReadonlyArray<{
    key: string
    label: string
    icon?: ComponentProps<typeof Button>['icon'] | undefined
  }>,
>({
  options,
  value,
  onValue,
}: {
  options: Options
  value: Options[number]['key']
  onValue: (value: Options[number]['key']) => void
}) {
  return (
    <XGroup borderRadius={0} borderColor="$color4" borderWidth={0}>
      {options.map((option) => (
        <RadioButton
          key={option.key}
          label={option.label}
          icon={option.icon}
          active={value === option.key}
          onPress={() => {
            onValue(option.key)
          }}
        />
      ))}
    </XGroup>
  )
}

function RadioButton({
  label,
  icon,
  active,
  onPress,
}: {
  label: string
  icon: ComponentProps<typeof Button>['icon'] | undefined
  active: boolean
  onPress: () => void
}) {
  return (
    <XGroup.Item>
      <Button
        disabled={active}
        icon={icon}
        chromeless
        backgroundColor="$colorTransparent"
        fontWeight={'bold'}
        color={active ? '$color12' : '$color10'}
        hoverStyle={{
          color: active ? '$color12' : '$color11',
        }}
        borderBottomWidth={2}
        borderBottomColor={active ? '$color12' : '$colorTransparent'}
        onPress={onPress}
        borderRadius={0}
      >
        {label}
      </Button>
    </XGroup.Item>
  )
}
