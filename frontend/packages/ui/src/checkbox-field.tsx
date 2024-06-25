import { Check } from '@tamagui/lucide-icons'
import React from 'react'
import { Checkbox, Label, XStack } from 'tamagui'

export function CheckboxField({
  value,
  onValue,
  labelProps,
  children,
  id,
  ...props
}: {
  value: boolean
  onValue: (value: boolean) => void
  labelProps?: React.ComponentProps<typeof Label>
  children: React.ReactNode | string
  id: string
} & React.ComponentProps<typeof XStack>) {
  console.log('CheckboxField', {value})
  return (
    <XStack {...props} gap="$3" ai="center">
      <Checkbox
        id={id}
        checked={typeof value == 'boolean' ? value : 'indeterminate'}
        onCheckedChange={onValue}
      >
        <Checkbox.Indicator>
          <Check />
        </Checkbox.Indicator>
      </Checkbox>
      <Label color="$color10" {...labelProps} htmlFor={id}>
        {children}
      </Label>
    </XStack>
  )
}
