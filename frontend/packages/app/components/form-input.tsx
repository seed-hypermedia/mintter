import {Control, FieldValues, Path, useController} from 'react-hook-form'
import {Input} from 'tamagui'

export function FormInput<Fields extends FieldValues>({
  control,
  name,
  ...props
}: React.ComponentProps<typeof Input> & {
  control: Control<Fields>
  name: Path<Fields>
}) {
  const c = useController({control, name})
  return <Input {...c.field} {...props} />
}
