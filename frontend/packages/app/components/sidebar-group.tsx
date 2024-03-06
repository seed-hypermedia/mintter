import {zodResolver} from '@hookform/resolvers/zod'
import {HMGroup, unpackHmId} from '@mintter/shared'
import {
  Button,
  Form,
  MoveLeft,
  Spinner,
  XStack,
  YStack,
  toast,
} from '@mintter/ui'
import {Plus, X} from '@tamagui/lucide-icons'
import {useEffect} from 'react'
import {SubmitHandler, useForm} from 'react-hook-form'
import {z} from 'zod'
import {usePublication} from '../models/documents'
import {
  useCreateGroupCategory,
  useGroup,
  useGroupNavigation,
} from '../models/groups'
import {useNavRoute} from '../utils/navigation'
import {useNavigate} from '../utils/useNavigate'
import {AppDialog, DialogTitle} from './dialog'
import {FormInput} from './form-input'
import {FormErrors, FormField} from './forms'
import {OptionsDropdown} from './options-dropdown'
import {GenericSidebarContainer, SidebarItem} from './sidebar-base'

export function GroupSidebar({
  groupId,
  onBackToMain,
}: {
  groupId: string
  onBackToMain: () => void
}) {
  const route = useNavRoute()
  const isHomeActive =
    route.key === 'group' &&
    route.groupId === groupId &&
    route.listCategory == null
  const isAllContentActive =
    route.key === 'group' &&
    route.groupId === groupId &&
    route.listCategory === '_all'
  const navigate = useNavigate()
  const groupRoute = route.key === 'group' ? route : null
  const group = useGroup(groupId, groupRoute?.version)
  const navigationPub = useGroupNavigation(groupId, groupRoute?.version)
  const activeCategorization = {}
  const activeDocId = route.key === 'publication' ? route.documentId : null
  navigationPub.data?.document?.children?.forEach((blockNode) => {
    const {block} = blockNode
    const activeItem = blockNode.children?.find((item) => {
      const ref = item.block?.ref
      const id = ref ? unpackHmId(ref) : null
      return id && id.qid === activeDocId
    })
    if (activeItem) {
      activeCategorization[block.id] = activeItem.block.ref
    }
  })
  let activeUncategorized: string | null = null
  if (Object.entries(activeCategorization).length === 0) {
    activeUncategorized = activeDocId
  }
  return (
    <GenericSidebarContainer>
      <YStack>
        <SidebarItem
          minHeight={30}
          paddingVertical="$1"
          color="$color10"
          title="Back Home"
          onPress={() => {
            onBackToMain()
          }}
          icon={MoveLeft}
        />

        <SidebarItem
          active={isHomeActive}
          onPress={() => {
            if (!isHomeActive) {
              navigate({
                key: 'group',
                groupId: groupId,
                accessory: groupRoute?.accessory,
                version: groupRoute?.version,
              })
            }
          }}
          title={group.data?.title}
        />
        <SidebarItem
          onPress={() => {
            if (!isAllContentActive) {
              navigate({
                key: 'group',
                groupId: groupId,
                listCategory: '_all',
                accessory: groupRoute?.accessory,
                version: groupRoute?.version,
              })
            }
          }}
          active={isAllContentActive}
          title="All Content"
        />
        {activeUncategorized ? (
          <ActiveDocSidebarItem id={activeUncategorized} />
        ) : null}
        {navigationPub.data?.document?.children?.map((blockNode) => {
          const {block} = blockNode
          const activeItemRef = activeCategorization[block.id]
          if (block.type !== 'heading') return null
          return (
            <>
              <SidebarItem
                title={block.text}
                active={
                  route.key === 'group' && route.listCategory === block.id
                }
                rightHover={[
                  <OptionsDropdown
                    menuItems={[
                      {
                        key: 'delete',
                        icon: X,
                        label: 'Delete Category',
                        onPress: () => {},
                      },
                    ]}
                  />,
                ]}
                onPress={() => {
                  navigate({
                    key: 'group',
                    groupId,
                    version: groupRoute?.version,
                    accessory: groupRoute?.accessory,
                    listCategory: block.id,
                  })
                }}
              />
              {activeItemRef ? (
                <ActiveDocSidebarItem id={activeItemRef} />
              ) : null}
            </>
          )
        })}
        <XStack padding="$4">
          <AppDialog
            ContentComponent={CreateGroupCategoryDialog}
            TriggerComponent={NewCategoryButton}
            triggerComponentProps={{}}
            contentComponentProps={{input: groupId}}
          />
        </XStack>
      </YStack>
    </GenericSidebarContainer>
  )
}

function ActiveDocSidebarItem({id}: {id: string | null}) {
  const docId = id ? unpackHmId(id) : null
  const pub = usePublication({
    id: docId?.qid,
    version: docId?.version || undefined,
  })
  return (
    <SidebarItem
      title={pub.data?.document?.title || ''}
      active
      indented
      onPress={() => {}}
    />
  )
}

function NewCategoryButton({onPress}: {onPress?: () => void}) {
  return (
    <Button icon={Plus} size="$2" onPress={onPress}>
      New Category
    </Button>
  )
}
const createCategorySchema = z.object({
  title: z.string(),
})
type CreateCategoryFields = z.infer<typeof createCategorySchema>

function CreateGroupCategoryForm({
  onClose,
  group,
}: {
  onClose: () => void
  group: HMGroup
}) {
  const {mutateAsync} = useCreateGroupCategory()
  const {
    control,
    handleSubmit,
    setFocus,
    formState: {errors},
  } = useForm<CreateCategoryFields>({
    resolver: zodResolver(createCategorySchema),
    defaultValues: {
      title: '',
    },
  })

  useEffect(() => {
    setFocus('title')
  }, [setFocus])

  const onSubmit: SubmitHandler<CreateCategoryFields> = (data) => {
    if (!group.id) {
      toast.error('Group ID not found')
      return
    }
    onClose()
    toast.promise(
      mutateAsync({...data, groupId: group.id}).then(() => {}),
      {
        loading: 'Creating...',
        success: 'Created Category',
        error: 'Failed to Create Category',
      },
    )
  }
  return (
    <>
      <DialogTitle>Create Category in &quot;{group.title}&quot;</DialogTitle>
      <Form onSubmit={handleSubmit(onSubmit)}>
        <YStack space marginBottom="$4">
          <FormErrors errors={errors} />
          <FormField name="title" label="Title" errors={errors}>
            <FormInput
              placeholder={'Category Name'}
              control={control}
              name="title"
            />
          </FormField>
        </YStack>
        <XStack jc="center">
          <Form.Trigger asChild>
            <Button theme="green">Create Category</Button>
          </Form.Trigger>
        </XStack>
      </Form>
    </>
  )
}

function CreateGroupCategoryDialog({
  input,
  onClose,
}: {
  input: string
  onClose: () => void
}) {
  const group = useGroup(input)
  console.log('HEllooooo', input, group.data)
  if (!group.data) return <Spinner />
  return <CreateGroupCategoryForm group={group.data} onClose={onClose} />
}
