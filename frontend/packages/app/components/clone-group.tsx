import {zodResolver} from '@hookform/resolvers/zod'
import {Button, Form, Input, Label, Spinner} from '@mintter/ui'
import {useEffect} from 'react'
import {
  Control,
  FieldValues,
  Path,
  SubmitHandler,
  useController,
  useForm,
} from 'react-hook-form'
import {toast} from 'react-hot-toast'
import * as z from 'zod'
import {useCreateGroup, useGroup, useGroupContent} from '../models/groups'
import {useNavigate} from '../utils/useNavigate'
import {DialogTitle} from './dialog'
import {Group} from '@mintter/shared'

const cloneGroupSchema = z.object({
  title: z.string().min(1, {message: 'Group title is required'}),
  description: z.string().optional(),
  // copyMembers: z.boolean(),
})
type NewGroupFields = z.infer<typeof cloneGroupSchema>

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

function CloneGroupForm({
  onClose,
  group,
  content,
}: {
  onClose: () => void
  group: Group
  content: Record<string, string>
}) {
  const {mutateAsync} = useCreateGroup()
  const navigate = useNavigate()
  const {
    control,
    handleSubmit,
    setFocus,
    formState: {errors},
  } = useForm<NewGroupFields>({
    resolver: zodResolver(cloneGroupSchema),
    defaultValues: {
      title: `Cloned ${group.title}`,
      description: group.description,
      // copyMembers: true,
    },
  })

  useEffect(() => {
    setFocus('title')
  }, [setFocus])

  const onSubmit: SubmitHandler<NewGroupFields> = (data) => {
    onClose()
    toast.promise(
      mutateAsync({...data, content}).then((groupId) => {
        navigate({
          key: 'group',
          groupId,
        })
      }),
      {
        loading: 'Creating...',
        success: 'Group Cloned!',
        error: 'Failed to Clone Group',
      },
    )
  }
  console.log(errors)

  return (
    <>
      <DialogTitle>Clone &quot;{group.title}&quot;</DialogTitle>
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

export function CloneGroupDialog({
  input,
  onClose,
}: {
  input: string
  onClose: () => {}
}) {
  const group = useGroup(input)
  const groupContent = useGroupContent(input)
  if (!group.data || !groupContent.data) return <Spinner />
  return (
    <CloneGroupForm
      group={group.data}
      content={groupContent.data?.content}
      onClose={onClose}
    />
  )
}
