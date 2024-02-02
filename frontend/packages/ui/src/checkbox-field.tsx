import {Check} from '@tamagui/lucide-icons'
import React from 'react'
import {Checkbox, Label, XStack} from 'tamagui'

export function CheckboxField({
  value,
  onValue,
  labelProps,
  children,
  ...props
}: {
  value: boolean
  onValue: (value: boolean) => void
  labelProps?: React.ComponentProps<typeof Label>
  children: React.ReactNode | string
} & React.ComponentProps<typeof XStack>) {
  const fieldId = React.useId()
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
      <Label color="$color10" {...labelProps} htmlFor={fieldId}>
        {children}
      </Label>
    </XStack>
  )
}
