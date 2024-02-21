import {ChevronDown, ChevronUp} from '@tamagui/lucide-icons'
import {Control, FieldValues, Path, useController} from 'react-hook-form'
import {Select, SizableText, YStack} from 'tamagui'

export function SelectInput<Fields extends FieldValues>({
  control,
  name,
  options,
  noOptionsMessage,
  placeholder,
  ...props
}: {
  options: {value: string; label: string}[]
  control: Control<Fields>
  name: Path<Fields>
  placeholder?: string
  noOptionsMessage?: string
}) {
  const c = useController({control, name})
  if (options.length === 0 && noOptionsMessage) {
    return <SizableText color="$red10">{noOptionsMessage}</SizableText>
  }
  return (
    <Select
      id="name"
      value={c.field.value}
      name={c.field.name}
      onValueChange={c.field.onChange}
      //   c.field.onBlur
      //   ref={c.field.ref}
      // disabled={c.field.disabled}
    >
      <Select.Trigger width={265}>
        <Select.Value placeholder={placeholder} />
      </Select.Trigger>
      <Select.Content zIndex={200000}>
        <Select.ScrollUpButton
          alignItems="center"
          justifyContent="center"
          position="relative"
          width="100%"
          height="$3"
        >
          <YStack zIndex={10}>
            <ChevronUp size={20} />
          </YStack>
        </Select.ScrollUpButton>
        <Select.Viewport
          animation="fast"
          // animateOnly={['transform', 'opacity']}
          enterStyle={{opacity: 0, y: -10}}
          exitStyle={{opacity: 0, y: 10}}
          minWidth={200}
        >
          {options.map((option, index) => (
            <Select.Item index={index} value={option.value} key={option.value}>
              <Select.ItemText>{option.label}</Select.ItemText>
            </Select.Item>
          ))}
        </Select.Viewport>

        <Select.ScrollDownButton
          alignItems="center"
          justifyContent="center"
          position="relative"
          width="100%"
          height="$3"
        >
          <YStack zIndex={10}>
            <ChevronDown size={20} />
          </YStack>
        </Select.ScrollDownButton>
      </Select.Content>
    </Select>
  )
}
