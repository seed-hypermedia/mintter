import {Button, Form, Input, Label} from '@mintter/ui'
import {Tooltip} from '@mintter/ui'
import {FilePlus2} from '@tamagui/lucide-icons'
import {AppDialog, DialogTitle} from './dialog'
import {toast} from 'react-hot-toast'
import {useCreateGroup} from '../models/groups'
import {useRef} from 'react'
import {TextInput} from 'react-native'
import {useNavigate} from '../utils/navigation'

function AddGroupForm({onClose}: {onClose: () => void}) {
  const {mutateAsync} = useCreateGroup()
  const titleInput = useRef<TextInput | null>(null)
  const descriptionInput = useRef<TextInput | null>(null)
  const navigate = useNavigate()
  return (
    <>
      <DialogTitle>Create HyperDocs Group</DialogTitle>
      <Form
        onSubmit={() => {
          // @ts-expect-error
          const title: string = titleInput.current?.value || ''
          // @ts-expect-error
          const description: string = descriptionInput.current?.value || ''

          onClose()
          toast.promise(
            mutateAsync({
              title,
              description,
            }).then((groupId) => {
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
        }}
      >
        <Label htmlFor="title">Title</Label>
        <Input ref={titleInput} placeholder={'Group Name'} id="title" />
        <Label htmlFor="description">Description</Label>
        <Input
          multiline
          ref={descriptionInput}
          minHeight={60}
          placeholder={'About this group...'}
          id="description"
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
    <Button size="$2" iconAfter={FilePlus2} {...props}>
      Create Group
    </Button>
  )
}
export function AddGroupButton() {
  return (
    <Tooltip content="Create HyperDocs Group">
      <AppDialog
        TriggerComponent={NewGroupButton}
        ContentComponent={AddGroupForm}
      />
    </Tooltip>
  )
}
