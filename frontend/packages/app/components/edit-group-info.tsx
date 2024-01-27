import {Group} from '@mintter/shared'
import {
  Button,
  Form,
  Input,
  Label,
  Spinner,
  TextInput,
  toast,
} from '@mintter/ui'
import {useRef} from 'react'
import {useGroup, useUpdateGroup} from '../models/groups'
import {DialogTitle, useAppDialog} from './dialog'

function EditGroupInfoForm({
  initialGroup,
  onClose,
}: {
  initialGroup: Group
  onClose: () => void
}) {
  const {mutateAsync} = useUpdateGroup()
  const titleInput = useRef<TextInput | null>(null)
  const descriptionInput = useRef<TextInput | null>(null)
  return (
    <Form
      onSubmit={() => {
        const title: string = titleInput.current?.value || ''
        const description: string = descriptionInput.current?.value || ''

        onClose()
        toast.promise(
          mutateAsync({
            id: initialGroup.id,
            title,
            description,
          }).then(() => {}),
          {
            loading: 'Updating...',
            success: 'Group Updated!',
            error: 'Failed to Update Group',
          },
        )
      }}
    >
      <Label htmlFor="title">Title</Label>
      <Input
        ref={titleInput}
        placeholder={'Group Name'}
        id="title"
        defaultValue={initialGroup.title}
      />
      <Label htmlFor="description">Description</Label>
      <Input
        multiline
        ref={descriptionInput}
        minHeight={60}
        placeholder={'About this group...'}
        id="description"
        defaultValue={initialGroup.description}
      />

      <Form.Trigger asChild>
        <Button>Update Group</Button>
      </Form.Trigger>
    </Form>
  )
}

function EditGroupInfoDialog({
  onClose,
  input: groupId,
}: {
  input: string
  onClose: () => void
}) {
  const group = useGroup(groupId)
  let content = <Spinner />
  if (group.data) {
    content = <EditGroupInfoForm initialGroup={group.data} onClose={onClose} />
  }
  return (
    <>
      <DialogTitle>Edit Group Info</DialogTitle>
      {content}
    </>
  )
}

export function useEditGroupInfoDialog() {
  return useAppDialog<string>(EditGroupInfoDialog)
}
