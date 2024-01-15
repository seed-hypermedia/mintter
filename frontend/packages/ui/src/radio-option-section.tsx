import React from 'react'
import {Label, RadioGroup, SizableText, XStack, YStack} from 'tamagui'

type RadioOption = {
  value: string
  label: string
}
type RadioOptions = ReadonlyArray<RadioOption>

export function RadioOptionSection<Options extends RadioOptions>({
  options,
  value,
  onValue,
  title,
}: {
  options: Options
  value: Options[number]['value']
  onValue: (value: Options[number]['value']) => void
  title: string
}) {
  const id = React.useId()
  return (
    <YStack>
      <SizableText fontWeight="bold">{title}</SizableText>
      <RadioGroup
        value={value}
        onValueChange={onValue}
        backgroundColor={'$color1'}
        borderWidth={1}
        borderColor="$borderColor"
        borderRadius="$3"
        paddingHorizontal="$3"
      >
        {options.map((option) => {
          return (
            <XStack key={option.value} gap="$3" ai="center">
              <RadioGroup.Item
                value={option.value}
                id={`${id}-${option.value}`}
              >
                <RadioGroup.Indicator />
              </RadioGroup.Item>
              <Label htmlFor={`${id}-${option.value}`}>{option.label}</Label>
            </XStack>
          )
        })}
      </RadioGroup>
    </YStack>
  )
}
