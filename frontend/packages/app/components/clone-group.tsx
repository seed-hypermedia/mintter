import {zodResolver} from '@hookform/resolvers/zod'
import {Group} from '@shm/shared'
import {
  Button,
  Check as CheckIcon,
  Checkbox,
  Form,
  Input,
  Label,
  Spinner,
  XStack,
  YStack,
  toast,
} from '@shm/ui'
import {useEffect} from 'react'
import {
  Control,
  FieldValues,
  Path,
  SubmitHandler,
  useController,
  useForm,
} from 'react-hook-form'
import * as z from 'zod'
import {useAccount, useMyAccount} from '../models/accounts'
import {
  useCreateGroup,
  useGroup,
  useGroupContent,
  useGroupMembers,
} from '../models/groups'
import {getAvatarUrl} from '../utils/account-url'
import {useNavigate} from '../utils/useNavigate'
import {Avatar} from './avatar'
import {DialogTitle} from './dialog'
import {FormErrors, FormField} from './forms'

const cloneGroupSchema = z.object({
  title: z.string().min(1, {message: 'Group title is required'}),
  members: z.array(z.string()).optional(),
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

function MemberCheckbox({
  id,
  checked,
  onCheckedChange,
}: {
  id: string
  checked: boolean
  onCheckedChange: (v: boolean) => void
}) {
  const account = useAccount(id)
  const profile = account.data?.profile
  return (
    <XStack space ai="center">
      <Checkbox
        id={`member-${id}`}
        size="$4"
        checked={checked}
        onCheckedChange={onCheckedChange}
      >
        <Checkbox.Indicator>
          <CheckIcon />
        </Checkbox.Indicator>
      </Checkbox>

      <Label htmlFor={`member-${id}`}>
        <XStack space ai="center">
          <Avatar
            label={profile?.alias}
            url={getAvatarUrl(profile?.avatar)}
            size="$2"
          />
          {profile?.alias || id}
        </XStack>
        {/* {profile?.avatar || id} */}
      </Label>
    </XStack>
  )
}

function MembersCheckboxes({
  control,
  groupId,
  members,
}: {
  control: Control<NewGroupFields>
  groupId: string
  members?: string[]
}) {
  const c = useController({control, name: 'members'})
  const selectedMembers = new Set(c.field.value)
  if (!members) return <Spinner />
  return (
    <YStack space>
      {members.map((id) => {
        return (
          <MemberCheckbox
            id={id}
            key={id}
            checked={selectedMembers.has(id)}
            onCheckedChange={(isSelected: boolean) => {
              const updatedMembers = new Set(c.field.value)
              if (isSelected) {
                updatedMembers.add(id)
              } else {
                updatedMembers.delete(id)
              }
              console.log(Array.from(updatedMembers))
              c.field.onChange(Array.from(updatedMembers))
            }}
          />
        )
      })}
    </YStack>
  )
}

function MembersInput({
  control,
  groupId,
}: {
  control: Control<NewGroupFields>
  groupId: string
}) {
  const c = useController({control, name: 'members'})
  const members = useGroupMembers(groupId)
  const myAccount = useMyAccount()
  const groupMemberIds = members.data?.members
    ? Object.keys(members.data?.members).filter((accountId) => {
        return accountId !== myAccount.data?.id
      })
    : []
  if (Array.isArray(c.field.value)) {
    return (
      <MembersCheckboxes
        control={control}
        groupId={groupId}
        members={groupMemberIds}
      />
    )
  }

  return (
    <XStack>
      <Button
        id="members"
        onPress={() => {
          c.field.onChange(groupMemberIds)
        }}
      >
        Copy Group Members
      </Button>
    </XStack>
  )
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
      members: undefined,
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
  return (
    <>
      <DialogTitle>Clone &quot;{group.title}&quot;</DialogTitle>
      <Form onSubmit={handleSubmit(onSubmit)}>
        <YStack space marginBottom="$4">
          <FormErrors errors={errors} />
          <FormField name="title" label="Title" errors={errors}>
            <FormInput
              placeholder={'Group Name'}
              control={control}
              name="title"
            />
          </FormField>
          <Label htmlFor="members">Members</Label>
          <MembersInput control={control} groupId={group.id} />
        </YStack>
        <XStack jc="center">
          <Form.Trigger asChild>
            <Button theme="green">Clone Group</Button>
          </Form.Trigger>
        </XStack>
      </Form>
    </>
  )
}

export function CloneGroupDialog({
  input,
  onClose,
}: {
  input: string
  onClose: () => void
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
