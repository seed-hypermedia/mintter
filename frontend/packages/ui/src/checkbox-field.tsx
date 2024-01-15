import {Check} from '@tamagui/lucide-icons'
import React from 'react'
import {Checkbox, Label, XStack} from 'tamagui'

export function CheckboxField({
  value,
  onValue,
  children,
  ...props
}: {
  value: boolean

  onValue: (value: boolean) => void
  children: React.ReactNode | string
} & React.ComponentProps<typeof XStack>) {
  const fieldId = React.useId()
  console.log('value', value)
  return (
    <XStack {...props} gap="$3" ai="center">
      <Checkbox
        id={fieldId}
        value={value ? 'checked' : ''}
        onCheckedChange={onValue}
      >
        <Checkbox.Indicator>
          <Check />
        </Checkbox.Indicator>
      </Checkbox>
      <Label color="$color10" htmlFor={fieldId}>
        {children}
      </Label>
    </XStack>
  )
}
