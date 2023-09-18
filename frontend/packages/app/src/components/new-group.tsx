import {Button, Form, Input, Label} from '@mintter/ui'
import {Tooltip} from '@mintter/ui'
import {BookPlus, FilePlus2} from '@tamagui/lucide-icons'
import {AppDialog, DialogTitle} from './dialog'
import {toast} from 'react-hot-toast'
import {useCreateGroup} from '../models/groups'
import {useNavigate} from '../utils/useNavigate'
import {
  Control,
  FieldValues,
  Path,
  SubmitHandler,
  useController,
  useForm,
} from 'react-hook-form'
import {zodResolver} from '@hookform/resolvers/zod'
import * as z from 'zod'
import {useEffect} from 'react'

const newGroupSchema = z.object({
  title: z.string().min(1, {message: 'Group title is required'}),
  description: z.string().optional(),
})
type NewGroupFields = z.infer<typeof newGroupSchema>

function FormInput<Fields extends FieldValues>({
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

function AddGroupForm({
  onClose,
  isOpen,
}: {
  onClose: () => void
  isOpen: boolean
}) {
  const {mutateAsync} = useCreateGroup()
  const navigate = useNavigate()
  const {
    control,
    handleSubmit,
    setFocus,
    formState: {errors},
  } = useForm<NewGroupFields>({
    resolver: zodResolver(newGroupSchema),
  })

  useEffect(() => {
    isOpen && setFocus('title')
  }, [isOpen, setFocus])

  const onSubmit: SubmitHandler<NewGroupFields> = (data) => {
    onClose()
    toast.promise(
      mutateAsync(data).then((groupId) => {
        navigate({
          key: 'group',
          groupId,
        })
      }),
      {
        loading: 'Creating...',
        success: 'Group Created!',
        error: 'Failed to Create Group',
      },
    )
  }
  console.log(errors)

  return (
    <>
      <DialogTitle>Create Group</DialogTitle>
      <Form onSubmit={handleSubmit(onSubmit)}>
        <Label htmlFor="title">Title</Label>
        <FormInput placeholder={'Group Name'} control={control} name="title" />
        <Label htmlFor="description">Description</Label>
        <FormInput
          multiline
          minHeight={60}
          placeholder={'About this group...'}
          control={control}
          name="description"
        />
        <Form.Trigger asChild>
          <Button>Create Group</Button>
        </Form.Trigger>
      </Form>
    </>
  )
}

function NewGroupButton(props: React.ComponentProps<typeof Button>) {
  return (
    <Button size="$2" iconAfter={BookPlus} {...props}>
      Create Group
    </Button>
  )
}
export function AddGroupButton() {
  return (
    <Tooltip content="Create Hypermedia Group">
      <AppDialog
        TriggerComponent={NewGroupButton}
        ContentComponent={AddGroupForm}
      />
    </Tooltip>
  )
}
