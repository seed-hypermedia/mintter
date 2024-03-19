import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {CSS} from '@dnd-kit/utilities'
import {zodResolver} from '@hookform/resolvers/zod'
import {HMGroup, Role, unpackHmId} from '@mintter/shared'
import {
  AlertDialog,
  Button,
  Form,
  Spinner,
  XStack,
  YGroup,
  YStack,
  toast,
} from '@mintter/ui'
import {
  Book,
  Folder,
  FolderPen,
  List,
  Newspaper,
  Plus,
  Undo2,
  X,
} from '@tamagui/lucide-icons'
import {PropsWithChildren, useEffect, useState} from 'react'
import {SubmitHandler, useForm} from 'react-hook-form'
import {z} from 'zod'
import {useMyAccount} from '../models/accounts'
import {
  useCreateGroupCategory,
  useDeleteCategory,
  useGroup,
  useGroupMembers,
  useGroupNavigation,
  useMoveCategory,
  useRenameGroupCateogry,
} from '../models/groups'
import {useNavRoute} from '../utils/navigation'
import {useNavigate} from '../utils/useNavigate'
import {AppDialog, DialogTitle, useAppDialog} from './dialog'
import {FormInput} from './form-input'
import {FormErrors, FormField} from './forms'
import {
  GenericSidebarContainer,
  SidebarDocument,
  SidebarItem,
} from './sidebar-base'

type CategoryItem = {
  id: string
  label: string
}

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
  const isFeedActive = route.key === 'group-feed' && route.groupId === groupId
  const replace = useNavigate('replace')
  const navigate = useNavigate()
  const groupMembers = useGroupMembers(groupId)
  const myAccount = useMyAccount()
  const myMemberRole =
    groupMembers.data?.members[myAccount.data?.id || ''] ||
    Role.ROLE_UNSPECIFIED
  const groupRoute = route.key === 'group' ? route : null
  const group = useGroup(groupId, groupRoute?.version)
  const navigationPub = useGroupNavigation(groupId, groupRoute?.version)
  const activeCategorization = {}
  const pubRoute = route.key === 'publication' ? route : null
  const activeDocId = pubRoute?.documentId
  const activeCategory = pubRoute?.groupVariantCategory
  navigationPub.data?.document?.children?.forEach((blockNode) => {
    const {block} = blockNode
    const activeItem = activeDocId
      ? blockNode.children?.find((item) => {
          const ref = item.block?.ref
          const id = ref ? unpackHmId(ref) : null
          return id && id.qid === activeDocId
        })
      : null
    if (activeItem) {
      activeCategorization[block.id] = activeItem.block.ref
    }
  })
  useEffect(() => {
    const activeCategories = Object.entries(activeCategorization)
    if (activeCategories.length === 1) {
      const [categoryId, docId] = activeCategories[0]
      if (categoryId === activeCategory) return
      if (!pubRoute) return
      replace({
        ...pubRoute,
        groupVariantCategory: categoryId,
      })
    }
  }, [activeCategorization, activeCategory, pubRoute])
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )
  const items: CategoryItem[] =
    navigationPub.data?.document?.children
      ?.filter((blockNode) => {
        if (blockNode.block.type !== 'heading') return false
        return true
      })
      .map((blockNode) => {
        return {
          id: blockNode.block.id,
          label: blockNode.block.text,
        }
      }) || []
  const [temporaryItems, setTemporaryItems] = useState<null | CategoryItem[]>(
    null,
  )
  const moveCategory = useMoveCategory(groupId)
  const deleteCategoryDialog = useAppDialog(DeleteCategoryDialog, {
    isAlert: true,
  })
  const renameCategoryDialog = useAppDialog(RenameCategoryDialog)
  function handleDragEnd({active, over}) {
    const oldIndex = items.findIndex((item) => item.id === active.id)
    const toIndex = items.findIndex((item) => item.id === over.id)
    const referenceIndices = items.map((item) => item.id)
    let leftSibling = referenceIndices[toIndex - 1]
    if (leftSibling === active.id) leftSibling = referenceIndices[toIndex]
    if (active.id === over.id) return
    setTemporaryItems(arrayMove(items, oldIndex, toIndex))
    setTimeout(() => {
      setTemporaryItems(null)
    }, 200)
    moveCategory.mutate({categoryId: active.id, leftSibling})
  }
  const displayItems = temporaryItems || items
  return (
    <GenericSidebarContainer>
      <YStack paddingVertical="$2">
        <SidebarItem
          minHeight={30}
          paddingVertical="$2"
          color="$color10"
          title="Home Navigation"
          onPress={() => {
            onBackToMain()
          }}
          icon={Undo2}
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
          bold
          paddingVertical="$4"
          icon={Book}
          title={group.data?.title}
        />
        <SidebarItem
          onPress={() => {
            if (!isFeedActive) {
              navigate({
                key: 'group-feed',
                groupId: groupId,
              })
            }
          }}
          icon={Newspaper}
          active={isFeedActive}
          title="Group Feed"
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
          icon={List}
          active={isAllContentActive}
          title="All Content"
        />
        <YGroup borderRadius={0}>
          {activeDocId && activeCategory == null ? (
            <ActiveDocSidebarItem id={activeDocId} />
          ) : null}
        </YGroup>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={displayItems}
            disabled={myMemberRole === Role.ROLE_UNSPECIFIED}
            strategy={verticalListSortingStrategy}
          >
            {displayItems.map((item) => {
              const activeItemRef =
                item.id === activeCategory ? activeDocId : null
              return (
                <SortableItem key={item.id} id={item.id}>
                  <SidebarItem
                    title={item.label}
                    active={
                      route.key === 'group' && route.listCategory === item.id
                    }
                    menuItems={
                      myMemberRole === Role.ROLE_UNSPECIFIED
                        ? []
                        : [
                            {
                              key: 'delete',
                              icon: X,
                              label: 'Delete Category',
                              onPress: () => {
                                deleteCategoryDialog.open({
                                  groupId,
                                  categoryId: item.id,
                                })
                              },
                            },
                            {
                              key: 'rename',
                              icon: FolderPen,
                              label: 'Rename Category',
                              onPress: () => {
                                renameCategoryDialog.open({
                                  groupId,
                                  categoryId: item.id,
                                  title: item.label,
                                })
                              },
                            },
                          ]
                    }
                    icon={Folder}
                    onPress={() => {
                      navigate({
                        key: 'group',
                        groupId,
                        version: groupRoute?.version,
                        accessory: groupRoute?.accessory,
                        listCategory: item.id,
                      })
                    }}
                  />
                  <YGroup borderRadius={0}>
                    {activeItemRef ? (
                      <ActiveDocSidebarItem
                        key={activeItemRef}
                        id={activeItemRef}
                      />
                    ) : null}
                  </YGroup>
                </SortableItem>
              )
            })}
          </SortableContext>
        </DndContext>
        {myMemberRole === Role.ROLE_UNSPECIFIED ? null : (
          <XStack padding="$4">
            <AppDialog
              ContentComponent={CreateGroupCategoryDialog}
              TriggerComponent={NewCategoryButton}
              triggerComponentProps={{}}
              contentComponentProps={{input: groupId}}
            />
          </XStack>
        )}
      </YStack>
      {deleteCategoryDialog.content}
      {renameCategoryDialog.content}
    </GenericSidebarContainer>
  )
}

function SortableItem({id, children}: PropsWithChildren<{id: string}>) {
  const {attributes, listeners, setNodeRef, transform, transition} =
    useSortable({id})

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  )
}

const renameCategorySchema = z.object({
  title: z.string(),
})
type RenameCategorySchema = z.infer<typeof renameCategorySchema>

function RenameCategoryDialog({
  onClose,
  input,
}: {
  onClose: () => void
  input: {groupId: string; categoryId: string; title: string}
}) {
  const {
    control,
    handleSubmit,
    setFocus,
    formState: {errors},
  } = useForm<RenameCategorySchema>({
    resolver: zodResolver(renameCategorySchema),
    defaultValues: {
      title: input.title,
    },
  })
  useEffect(() => {
    setTimeout(() => {
      setFocus('title', {
        shouldSelect: true,
      })
    }, 200) // the component gets blurred AFTER the focus, if this is timer is much lower! 😭 around 150ms it sometimes autofocuses correctly. this is so shameful. send help
  }, [setFocus])
  const renameCategory = useRenameGroupCateogry(input.groupId)
  function onSubmit(fields: RenameCategorySchema) {
    renameCategory.mutateAsync({
      categoryId: input.categoryId,
      title: fields.title,
    })
    onClose()
  }
  return (
    <Form onSubmit={handleSubmit(onSubmit)}>
      <DialogTitle>Rename Category</DialogTitle>
      <FormField name="title" label="Title" errors={errors}>
        <FormInput
          control={control}
          name="title"
          placeholder="Category title..."
        />
      </FormField>
      <Form.Trigger>
        <Button>Save Category Title</Button>
      </Form.Trigger>
    </Form>
  )
}

function DeleteCategoryDialog({
  onClose,
  input,
}: {
  onClose: () => void
  input: {groupId: string; categoryId: string}
}) {
  const deleteCategory = useDeleteCategory(input.groupId, {
    onSuccess: onClose,
  })
  return (
    <YStack gap="$4" padding="$4" borderRadius="$3">
      <AlertDialog.Title>Delete Category</AlertDialog.Title>
      <AlertDialog.Description>
        Delete this category from the group?
      </AlertDialog.Description>

      <XStack gap="$3" justifyContent="flex-end">
        <AlertDialog.Cancel asChild>
          <Button
            onPress={() => {
              onClose()
            }}
            chromeless
          >
            Cancel
          </Button>
        </AlertDialog.Cancel>
        <AlertDialog.Action asChild>
          <Button
            theme="red"
            onPress={() => {
              deleteCategory.mutate(input)
              onClose()
            }}
          >
            Delete Category
          </Button>
        </AlertDialog.Action>
      </XStack>
    </YStack>
  )
}

function ActiveDocSidebarItem({id}: {id: string | null}) {
  const docId = id ? unpackHmId(id) : null
  if (!docId) return null
  return (
    <SidebarDocument
      docId={docId.qid}
      docVersion={docId.version}
      isPinned={false}
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
