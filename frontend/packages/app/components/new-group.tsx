import {zodResolver} from '@hookform/resolvers/zod'
import {Button, Form, Label, toast} from '@mintter/ui'
import {Plus} from '@tamagui/lucide-icons'
import {ForwardedRef, forwardRef, useEffect} from 'react'
import {SubmitHandler, useForm} from 'react-hook-form'
import * as z from 'zod'
import {useCreateGroup} from '../models/groups'
import {useNavigate} from '../utils/useNavigate'
import {AppDialog, DialogTitle, useAppDialog} from './dialog'
import {FormInput} from './form-input'

const newGroupSchema = z.object({
  title: z.string().min(1, {message: 'Group title is required'}),
  description: z.string().optional(),
})
type NewGroupFields = z.infer<typeof newGroupSchema>

function AddGroupForm({
  onClose,
  isOpen,
  onComplete,
}: {
  onClose: () => void
  isOpen: boolean
  onComplete?: (groupId: string) => void
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
        if (onComplete) onComplete(groupId)
        else
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

const NewGroupButton = forwardRef(function NewGroupButton(
  props: React.ComponentProps<typeof Button>,
  ref: ForwardedRef<HTMLButtonElement>,
) {
  return (
    <Button
      backgroundColor={props.chromeless ? '$colorTransparent' : '$color4'}
      size="$2"
      ref={ref}
      icon={Plus}
      {...props}
    >
      {props.children}
    </Button>
  )
})

export function CreateGroupButton({
  triggerLabel = '',
  chromeless,
  onComplete,
}: {
  triggerLabel?: string
  chromeless?: boolean
  onComplete?: (groupId: string) => void
}) {
  return (
    <AppDialog
      TriggerComponent={NewGroupButton}
      triggerComponentProps={{chromeless}}
      ContentComponent={AddGroupForm}
      contentComponentProps={{onComplete}}
      triggerLabel={triggerLabel}
    />
  )
}

function AddGroupDialog({onClose}: {onClose: () => void}) {
  return <AddGroupForm onClose={onClose} isOpen />
}

export function useCreateGroupDialog() {
  return useAppDialog(AddGroupDialog)
}
