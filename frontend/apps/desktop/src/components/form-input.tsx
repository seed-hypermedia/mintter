import {Input, Text, TextArea} from '@shm/ui'
import {
  Control,
  FieldErrors,
  FieldValues,
  Path,
  useController,
} from 'react-hook-form'

export function FormInput<Fields extends FieldValues>({
  control,
  name,
  transformInput,
  ...props
}: React.ComponentProps<typeof Input> & {
  control: Control<Fields>
  name: Path<Fields>
  transformInput?: (input: string) => string
}) {
  const c = useController({control, name})
  const {onChange, ...inputProps} = c.field
  return (
    <Input
      {...inputProps}
      onChangeText={(text) => {
        if (transformInput) {
          onChange(transformInput(text))
        } else {
          onChange(text)
        }
      }}
      {...props}
    />
  )
}

export function FormTextArea<Fields extends FieldValues>({
  control,
  name,
  ...props
}: React.ComponentProps<typeof TextArea> & {
  control: Control<Fields>
  name: Path<Fields>
}) {
  const c = useController({control, name})
  return <TextArea {...c.field} {...props} />
}

export function FormError<TFieldValues extends Record<string, string>>({
  errors,
  name,
}: {
  errors?: FieldErrors<TFieldValues> | undefined
  name: keyof FieldErrors<TFieldValues>
}) {
  const error = errors?.[name]
  if (!error) return null
  return (
    <Text fontFamily="$body" color="$red9">
      {error.message}
    </Text>
  )
}
