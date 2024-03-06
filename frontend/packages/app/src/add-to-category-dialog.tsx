import {zodResolver} from '@hookform/resolvers/zod'
import {Button, DialogDescription, Form} from '@mintter/ui'
import {useForm} from 'react-hook-form'
import {z} from 'zod'
import {DialogTitle} from '../components/dialog'
import {SelectInput} from '../components/select-input'
import {useAddToCategory, useGroupCategories} from '../models/groups'

const addToCategoryFields = z.object({
  categoryId: z.string(),
})

type AddToCategoryFields = z.infer<typeof addToCategoryFields>

export function AddToCategoryDialog({
  input: {groupId, pathName, docId},
  onClose,
}: {
  input: {groupId: string; pathName: string; docId: string}
  onClose: () => void
}) {
  // const [renamed, setRenamed] = useState(pathName)
  const addToCategory = useAddToCategory()
  const {
    control,
    handleSubmit,
    setFocus,
    formState: {errors},
  } = useForm<AddToCategoryFields>({
    resolver: zodResolver(addToCategoryFields),
    defaultValues: {},
  })
  const groupCategories = useGroupCategories(groupId)
  return (
    <Form
      onSubmit={handleSubmit(async ({categoryId}) => {
        onClose()
        addToCategory.mutateAsync({
          groupId,
          docId,
          categoryId,
          pathName,
        })
      })}
    >
      <DialogTitle>Add to Category</DialogTitle>
      <DialogDescription>foo bar</DialogDescription>
      <SelectInput
        control={control}
        name="categoryId"
        placeholder="Select Category.."
        //   noOptionsMessage="You are not the editor or owner of any groups. Create a group to publish to."
        options={
          groupCategories?.map((category) => ({
            label: category.title,
            value: category.id,
          })) || []
        }
      />
      <Form.Trigger asChild>
        <Button>Save</Button>
      </Form.Trigger>
    </Form>
  )
}
