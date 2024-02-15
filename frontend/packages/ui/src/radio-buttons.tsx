import {ComponentProps} from 'react'
import {Button, Separator, XGroup} from 'tamagui'

export function RadioButtons<
  Options extends ReadonlyArray<{
    key: string
    label: string
    icon: ComponentProps<typeof Button>['icon'] | undefined
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
    <XGroup separator={<Separator vertical backgroundColor={'$color8'} />}>
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
        backgroundColor={active ? '$color7' : undefined}
        onPress={onPress}
      >
        {label}
      </Button>
    </XGroup.Item>
  )
}
