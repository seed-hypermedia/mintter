import * as Ariakit from '@ariakit/react'
import {CompositeInput} from '@ariakit/react-core/composite/composite-input'
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
import Footer from '@mintter/app/components/footer'
import {
  API_FILE_URL,
  Account,
  Document,
  Group,
  HMPublication,
  Profile,
  PublicationContent,
  Role,
  formattedDate,
  getBlockNode,
  pluralS,
  unpackDocId,
  unpackHmId,
} from '@mintter/shared'
import {
  AlertDialog,
  Button,
  Container,
  DialogDescription,
  DialogTitle,
  Form,
  H1,
  Heading,
  Label,
  ListItem,
  RadioButtons,
  Section,
  Separator,
  SizableText,
  Tooltip,
  View,
  XGroup,
  XStack,
  YGroup,
  YStack,
  toast,
} from '@mintter/ui'
import {
  ArrowUpRight,
  Pencil,
  PlusCircle,
  Store,
  Trash,
  X,
} from '@tamagui/lucide-icons'
import 'allotment/dist/style.css'
import {matchSorter} from 'match-sorter'
import {
  ComponentProps,
  ReactNode,
  forwardRef,
  useDeferredValue,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'
import {AccessoryLayout} from '../components/accessory-sidebar'
import {AccountLinkAvatar} from '../components/account-link-avatar'
import '../components/accounts-combobox.css'
import {Avatar} from '../components/avatar'
import {EntityVersionsAccessory} from '../components/changes-list'
import {useCopyGatewayReference} from '../components/copy-gateway-reference'
import {useAppDialog} from '../components/dialog'
import {EditDocButton} from '../components/edit-doc-button'
import {useEditGroupInfoDialog} from '../components/edit-group-info'
import {FavoriteButton} from '../components/favoriting'
import {FooterButton} from '../components/footer'
import {AppLinkText} from '../components/link'
import {copyLinkMenuItem} from '../components/list-item'
import {MainWrapper} from '../components/main-wrapper'
import {OptionsDropdown} from '../components/options-dropdown'
import {PublicationListItem} from '../components/publication-list-item'
import {CopyReferenceButton} from '../components/titlebar-common'
import appError from '../errors'
import {useAccount, useAllAccounts, useMyAccount} from '../models/accounts'
import {useEntityTimeline} from '../models/changes'
import {
  useDraftList,
  usePublication,
  usePublications,
} from '../models/documents'
import {useExperiments} from '../models/experiments'
import {useGatewayUrl} from '../models/gateway-settings'
import {
  useAddGroupMember,
  useDeleteCategoryItem,
  useFullGroupContent,
  useGroup,
  useGroupContent,
  useGroupMembers,
  useMoveCategoryItem,
  useRemoveDocFromGroup,
} from '../models/groups'
import {useOpenUrl} from '../open-url'
import {AddToCategoryDialog} from '../src/add-to-category-dialog'
import {RenamePubDialog} from '../src/rename-publication-dialog'
import {useNavRoute} from '../utils/navigation'
import {useOpenDraft} from '../utils/open-draft'
import {GroupRoute} from '../utils/routes'
import {hostnameStripProtocol} from '../utils/site-hostname'
import {useNavigate} from '../utils/useNavigate'
import {AppPublicationContentProvider} from './publication-content-provider'

export default function GroupPage() {
  const experiments = useExperiments()
  const route = useNavRoute()
  const groupRoute = route.key === 'group' ? route : undefined
  if (!groupRoute) throw new Error('Group page needs group route')
  const latestGroup = useGroup(groupRoute.groupId, undefined, {})
  const groupMembers = useGroupMembers(groupRoute.groupId)
  const myAccount = useMyAccount()
  const group = useGroup(groupRoute.groupId, groupRoute.version, {})
  const myMemberRole =
    groupMembers.data?.members[myAccount.data?.id || ''] ||
    Role.ROLE_UNSPECIFIED

  let content: ReactNode = null
  if (groupRoute.tab === 'documents') {
    content = (
      <GroupDocuments groupRoute={groupRoute} myMemberRole={myMemberRole} />
    )
  } else {
    content = <GroupFront groupRoute={groupRoute} myMemberRole={myMemberRole} />
  }

  return (
    <GroupPageFooterAccessory
      variantVersion={latestGroup.data?.version}
      route={groupRoute}
      groupVersion={group.data?.version}
    >
      {content}
    </GroupPageFooterAccessory>
  )
}

function GroupPageFooterAccessory({
  children,
  route,
  groupVersion,
  variantVersion,
}: {
  children: React.ReactNode
  route: GroupRoute
  groupVersion?: string | null
  variantVersion: string | undefined
}) {
  let accessory: ReactNode | null = null
  const entityId = unpackHmId(route.groupId)
  if (entityId && groupVersion && route.accessory?.key === 'versions') {
    accessory = (
      <EntityVersionsAccessory
        id={entityId}
        activeVersion={groupVersion}
        variantVersion={variantVersion}
      />
    )
  }
  return (
    <>
      <AccessoryLayout accessory={accessory}>{children}</AccessoryLayout>
      <Footer>
        <ChangesFooterItem route={route} />
      </Footer>
    </>
  )
}

function GroupHeader({
  groupRoute,
  myMemberRole,
}: {
  groupRoute: GroupRoute
  myMemberRole: Role
}) {
  const accessory = groupRoute?.accessory
  const {groupId, version} = groupRoute
  const group = useGroup(groupId, version, {
    // refetchInterval: 5_000,
  })
  const groupContent = useFullGroupContent(groupId, version)
  // const groupMembers = useGroupMembers(groupId, version)
  const groupMembers = useGroupMembers(groupId)
  const isMember = myMemberRole !== Role.ROLE_UNSPECIFIED
  // const isOwner = myAccount.data?.id === group.data?.ownerAccountId
  // const owner = groupMembers.data?.members[group.data?.ownerAccountId || '']
  const spawn = useNavigate('spawn')
  const replace = useNavigate('replace')
  const ownerAccount = useAccount(group.data?.ownerAccountId)
  const inviteMember = useAppDialog(InviteMemberDialog)
  const openDraft = useOpenDraft()
  const ownerAccountId = group.data?.ownerAccountId
  const frontDocumentUrl = groupContent.data?.content
    ? groupContent.data?.content['/']
    : undefined
  const memberCount = Object.keys(groupMembers.data?.members || {}).length
  const siteBaseUrl = group.data?.siteInfo?.baseUrl
  const {lastSyncTime, lastOkSyncTime} = group.data?.siteInfo || {}
  const now = useRoughTime()
  const syncAge = lastSyncTime ? now - lastSyncTime.seconds : 0n
  const isRecentlySynced = syncAge < 70n // slightly over 60s just in case. we are polling and updating time ever 5s
  const isRecentlyOkSynced = syncAge < 70n // slightly over 60s just in case. we are polling and updating time ever 5s
  const siteVersionMatches = true
  //https://www.notion.so/mintter/SiteInfo-version-not-set-c37f78820189401ab4621ae0f7c1b63a?pvs=4
  // const siteVersionMatches =
  //   group.data?.version === group.data?.siteInfo?.version
  const siteSyncStatus =
    isRecentlySynced && isRecentlyOkSynced
      ? siteVersionMatches
        ? GroupStatus.SyncedConnected
        : GroupStatus.UnsyncedConnected
      : GroupStatus.Disconnected
  const syncStatus = siteBaseUrl ? siteSyncStatus : undefined
  const removeDoc = useRemoveDocFromGroup()

  const openUrl = useOpenUrl()
  return (
    <Container paddingBottom={0}>
      <Section group="header" paddingVertical={0}>
        <XStack gap="$2">
          <H1 fontWeight="bold" f={1}>
            {group.data?.title}
          </H1>
          <YStack paddingTop="$4">
            <XStack alignItems="center" gap="$2">
              <Tooltip
                content={
                  group.data
                    ? `Open group in the web (${syncStatus?.message(
                        group.data,
                      )})`
                    : ''
                }
              >
                <Button
                  size="$2"
                  fontFamily={'$mono'}
                  fontSize="$4"
                  // hoverStyle={{textDecorationLine: 'underline'}}
                  onPress={() => {
                    openUrl(siteBaseUrl)
                  }}
                  color="$blue10"
                  icon={
                    syncStatus &&
                    group.data && (
                      <View
                        style={{
                          borderRadius: 5,
                          width: 10,
                          height: 10,
                          backgroundColor: syncStatus.color,
                        }}
                      />
                    )
                  }
                >
                  {hostnameStripProtocol(siteBaseUrl)}
                </Button>
              </Tooltip>
              <FavoriteButton url={groupId} />
              {!frontDocumentUrl && isMember && (
                <Tooltip content={'Create Front Document'}>
                  <Button
                    icon={Store}
                    size="$2"
                    onPress={() => {
                      openDraft(
                        {groupId, pathName: '/', key: 'group'},
                        {
                          pathName: '/',
                          initialTitle: group?.data?.title,
                        },
                      )
                    }}
                  >
                    Add a Frontpage
                  </Button>
                </Tooltip>
              )}
              <CopyReferenceButton />
            </XStack>
          </YStack>
        </XStack>
        <YStack>
          <XStack paddingVertical="$4" alignItems="center" gap="$3">
            <XStack gap="$3" flex={1} alignItems="flex-end">
              {ownerAccountId ? (
                <YStack
                  gap="$1"
                  padding="$2"
                  bg="$blue4"
                  borderRadius="$3"
                  alignItems="flex-start"
                >
                  <SizableText size="$1">Owner:</SizableText>
                  <XStack gap="$2">
                    <AccountLinkAvatar size={24} accountId={ownerAccountId} />
                    <AppLinkText
                      toRoute={{
                        key: 'account',
                        accountId: ownerAccountId,
                      }}
                    >
                      {ownerAccount.data?.profile?.alias}
                    </AppLinkText>
                  </XStack>
                </YStack>
              ) : null}
              <XStack paddingVertical="$2">
                {Object.entries(groupMembers.data?.members || {}).map(
                  ([memberId, role], idx) => {
                    if (role === Role.OWNER) return null
                    return (
                      <XStack
                        zIndex={idx + 1}
                        key={memberId}
                        borderColor="$background"
                        backgroundColor="$background"
                        borderWidth={2}
                        borderRadius={100}
                        marginLeft={-8}
                        animation="fast"
                      >
                        <AccountLinkAvatar size={24} accountId={memberId} />
                      </XStack>
                    )
                  },
                )}
              </XStack>
            </XStack>
            {memberCount > 1 || myMemberRole === Role.OWNER ? (
              <XStack>
                {myMemberRole === Role.OWNER ? (
                  <InviteMemberButton
                    onPress={() => {
                      inviteMember.open({groupId})
                    }}
                  />
                ) : (
                  <View />
                )}
              </XStack>
            ) : null}
          </XStack>
        </YStack>
        <XStack>
          <RadioButtons
            key={groupRoute.tab}
            value={groupRoute.tab || 'front'}
            options={[
              {key: 'front', label: 'Home'},
              {key: 'documents', label: 'Documents'},
              {key: 'activity', label: 'Activity'},
            ]}
            onValue={(tab) => {
              replace({
                ...groupRoute,
                tab,
              })
            }}
          />
        </XStack>
      </Section>
    </Container>
  )
}

function GroupFront({
  groupRoute,
  myMemberRole,
}: {
  groupRoute: GroupRoute
  myMemberRole: Role
}) {
  const accessory = groupRoute?.accessory
  const {groupId, version} = groupRoute
  const group = useGroup(groupId, version, {
    // refetchInterval: 5_000,
  })
  const groupContent = useFullGroupContent(groupId, version)
  // const groupMembers = useGroupMembers(groupId, version)
  const groupMembers = useGroupMembers(groupId)
  const isMember = myMemberRole !== Role.ROLE_UNSPECIFIED
  // const isOwner = myAccount.data?.id === group.data?.ownerAccountId
  // const owner = groupMembers.data?.members[group.data?.ownerAccountId || '']
  const spawn = useNavigate('spawn')
  const replace = useNavigate('replace')
  const ownerAccount = useAccount(group.data?.ownerAccountId)
  const inviteMember = useAppDialog(InviteMemberDialog)
  const openDraft = useOpenDraft()
  const ownerAccountId = group.data?.ownerAccountId
  const frontDocumentUrl = groupContent.data?.content
    ? groupContent.data?.content['/']
    : undefined
  const frontPageId = frontDocumentUrl ? unpackDocId(frontDocumentUrl) : null
  const memberCount = Object.keys(groupMembers.data?.members || {}).length
  const siteBaseUrl = group.data?.siteInfo?.baseUrl
  const {lastSyncTime, lastOkSyncTime} = group.data?.siteInfo || {}
  const now = useRoughTime()
  const syncAge = lastSyncTime ? now - lastSyncTime.seconds : 0n
  const isRecentlySynced = syncAge < 70n // slightly over 60s just in case. we are polling and updating time ever 5s
  const isRecentlyOkSynced = syncAge < 70n // slightly over 60s just in case. we are polling and updating time ever 5s
  const siteVersionMatches = true
  //https://www.notion.so/mintter/SiteInfo-version-not-set-c37f78820189401ab4621ae0f7c1b63a?pvs=4
  // const siteVersionMatches =
  //   group.data?.version === group.data?.siteInfo?.version
  const siteSyncStatus =
    isRecentlySynced && isRecentlyOkSynced
      ? siteVersionMatches
        ? GroupStatus.SyncedConnected
        : GroupStatus.UnsyncedConnected
      : GroupStatus.Disconnected
  const syncStatus = siteBaseUrl ? siteSyncStatus : undefined
  const editGroupInfo = useEditGroupInfoDialog()
  const removeDoc = useRemoveDocFromGroup()
  const frontDocMenuItems = [
    frontDocumentUrl && isMember
      ? {
          label: 'Remove Front Document',
          key: 'remove-front-doc',
          icon: Trash,
          onPress: () => {
            removeDoc
              .mutateAsync({groupId, pathName: '/'})
              .then(() => {
                toast.success('Removed front document')
              })
              .catch((error) => {
                appError(`Failed to remove front document: ${error?.message}`, {
                  error,
                })
              })
          },
        }
      : null,
  ].filter(Boolean)
  const openUrl = useOpenUrl()
  return (
    <MainWrapper maxHeight={'100%'}>
      <GroupHeader groupRoute={groupRoute} myMemberRole={myMemberRole} />
      <Container>
        {frontPageId && frontDocumentUrl && (
          <>
            <FrontPublicationDisplay
              urlWithVersion={frontDocumentUrl}
              groupTitle={group.data?.title || ''}
            />
            <XStack
              gap="$2"
              paddingVertical="$4"
              paddingHorizontal={0}
              minHeight="$6"
              group="item"
            >
              <XStack
                gap="$2"
                position="absolute"
                right={0}
                top="$4"
                alignItems="center"
              >
                {frontDocMenuItems.length ? (
                  <OptionsDropdown
                    hiddenUntilItemHover
                    menuItems={frontDocMenuItems}
                  />
                ) : null}
                <XGroup>
                  {isMember && (
                    <EditDocButton
                      contextRoute={groupRoute}
                      variants={[
                        {
                          key: 'group',
                          groupId,
                          pathName: '/',
                        },
                      ]}
                      docId={frontPageId?.docId}
                      baseVersion={frontPageId?.version || undefined}
                      navMode="push"
                    />
                  )}
                </XGroup>
                <Tooltip content="Open in New Window">
                  <Button
                    icon={ArrowUpRight}
                    size="$2"
                    onPress={() => {
                      spawn({
                        key: 'publication',
                        documentId: frontPageId?.docId,
                        variants: [
                          {
                            key: 'group',
                            groupId,
                            pathName: '/',
                          },
                        ],
                      })
                    }}
                  />
                </Tooltip>
              </XStack>
            </XStack>
          </>
        )}
      </Container>

      {inviteMember.content}
      {editGroupInfo.content}
    </MainWrapper>
  )
}

export function GroupDocuments({
  groupRoute,
  myMemberRole,
}: {
  groupRoute: GroupRoute
  myMemberRole: Role
}) {
  const {groupId, version} = groupRoute
  const latestGroupContent = useGroupContent(groupId)
  const [copyDialogContent, onCopyId] = useCopyGatewayReference()
  const groupContent = useFullGroupContent(groupId, version)
  const drafts = useDraftList()
  const group = useGroup(groupId, version, {
    // refetchInterval: 5_000,
  })

  return (
    <MainWrapper maxHeight={'100%'}>
      <GroupHeader groupRoute={groupRoute} myMemberRole={myMemberRole} />
      <Container>
        {//Object.entries(groupContent.data?.content || {})
        groupContent.data?.items.map(({key, pub, author, editors, id}) => {
          if (key === '/') return null
          const latestEntry = latestGroupContent.data?.content?.[key]
          const latestDocId = latestEntry ? unpackDocId(latestEntry) : null

          return (
            <GroupContentItem
              key={key}
              id={key}
              docId={id.qid}
              groupId={groupId}
              version={id?.version || undefined}
              latestVersion={latestDocId?.version || undefined}
              hasDraft={drafts.data?.documents.find((d) => d.id == id.qid)}
              onCopyUrl={() => {
                onCopyId({
                  ...id,
                  version: version || null,
                  variants: [{key: 'group', groupId, pathName: key}],
                  hostname: group.data?.siteInfo?.baseUrl || null,
                })
              }}
              pub={pub}
              userRole={myMemberRole}
              editors={editors}
              author={author}
              pathName={key}
            />
          )
        })}
      </Container>
      {copyDialogContent}
    </MainWrapper>
  )
}

export function GroupCategoryContent({
  groupRoute,
  myMemberRole,
  category,
}: {
  groupRoute: GroupRoute
  myMemberRole: Role
  category: string
}) {
  const {groupId, version} = groupRoute
  const latestGroupContent = useGroupContent(groupId)
  const [copyDialogContent, onCopyId] = useCopyGatewayReference()
  const categoryContent = getBlockNode(
    navPub.data?.document?.children,
    category,
  )

  const groupContent = useFullGroupContent(groupId, version)
  const drafts = useDraftList()
  const group = useGroup(groupId, version, {
    // refetchInterval: 5_000,
  })
  const contentItems =
    categoryContent?.children
      ?.map((node) => {
        const {block} = node
        const ref = block?.ref
        const id = ref ? unpackHmId(ref) : null
        if (!id) return null
        return {ref: id, id: id.qid, version: id.version || undefined}
      })
      .filter(Boolean) || []
  const publications = usePublications(contentItems)
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
  const items =
    categoryContent?.children?.map((blockNode) => {
      return {id: blockNode.block.id, ref: blockNode.block.ref}
    }) || []
  const moveItem = useMoveCategoryItem(groupId, category)
  const [temporaryItems, setTemporaryItems] = useState<
    null | {id: string; ref: string | undefined}[]
  >(null)
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
    moveItem.mutate({itemId: active.id, leftSibling})
  }
  const displayItems = temporaryItems || items

  const deleteItemDialog = useAppDialog(DeleteCategoryItemDialog, {
    isAlert: true,
  })

  return (
    <>
      <Container>
        {items.length === 0 ? (
          <SizableText fontSize="$4" color="$color10" margin="$4">
            No documents in this category yet.
          </SizableText>
        ) : null}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <YStack>
            <SortableContext
              items={displayItems}
              disabled={myMemberRole === Role.ROLE_UNSPECIFIED}
              strategy={verticalListSortingStrategy}
            >
              {displayItems.map(({ref, id}) => {
                const hmId = ref ? unpackHmId(ref) : null
                if (!hmId) return null
                const {variants} = hmId
                const groupVariant = variants?.find((v) => v.key === 'group')
                if (
                  !groupVariant ||
                  groupVariant.key !== 'group' ||
                  groupVariant.groupId !== groupId
                )
                  return null
                const {pathName} = groupVariant
                if (!pathName) return null
                const latestEntry = latestGroupContent.data?.content?.[pathName]
                const latestDocId = latestEntry
                  ? unpackDocId(latestEntry)
                  : null
                const pub = groupContent.data.items.find((p) => {
                  return p.id.qid === hmId.qid
                })

                const groupEntry = groupContent.data?.content?.[pathName]
                const groupEntryId = groupEntry ? unpackDocId(groupEntry) : null
                if (!groupEntryId) return null
                return (
                  <SortableGroupContentItem
                    key={id}
                    id={id}
                    docId={hmId.qid}
                    groupId={groupId}
                    version={groupEntryId?.version || undefined}
                    latestVersion={latestDocId?.version || undefined}
                    hasDraft={drafts.data?.documents.find(
                      (d) => d.id == hmId.qid,
                    )}
                    groupVariantCategory={category}
                    onRemoveFromCategory={
                      myMemberRole === Role.ROLE_UNSPECIFIED
                        ? undefined
                        : () => {
                            deleteItemDialog.open({
                              groupId,
                              itemId: id,
                              categoryLabel: categoryContent?.block.text || '?',
                            })
                          }
                    }
                    onCopyUrl={() => {
                      onCopyId({
                        ...hmId,
                        version: version || null,
                        variants: [{key: 'group', groupId, pathName}],
                        hostname: group.data?.siteInfo?.baseUrl || null,
                      })
                    }}
                    pub={pub?.pub}
                    userRole={myMemberRole}
                    editors={pub?.editors || []}
                    author={pub?.author}
                    pathName={pathName}
                  />
                )
              })}
            </SortableContext>
          </YStack>
        </DndContext>
      </Container>
      {deleteItemDialog.content}
      {copyDialogContent}
    </>
  )
}

function DeleteCategoryItemDialog({
  onClose,
  input,
}: {
  onClose: () => void
  input: {groupId: string; itemId: string; categoryLabel: string}
}) {
  const deleteItem = useDeleteCategoryItem(input.groupId, {
    onSuccess: onClose,
  })
  return (
    <YStack gap="$4" padding="$4" borderRadius="$3">
      <AlertDialog.Title>Remove Item from Category</AlertDialog.Title>
      <AlertDialog.Description>
        Remove this item from the "{input.categoryLabel}" category?
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
              deleteItem.mutate(input)
              onClose()
            }}
          >
            Delete from Category
          </Button>
        </AlertDialog.Action>
      </XStack>
    </YStack>
  )
}

function SortableGroupContentItem({
  id,
  ...props
}: ComponentProps<typeof GroupContentItem> & {id: string}) {
  const {attributes, listeners, setNodeRef, transform, transition} =
    useSortable({id})

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <GroupContentItem {...props} id={id} />
    </div>
  )
}

function GroupContentItem({
  docId,
  groupVariantCategory,
  id,
  version,
  latestVersion,
  hasDraft,
  groupId,
  pathName,
  userRole,
  pub,
  editors,
  author,
  onCopyUrl,
  onRemoveFromCategory,
}: {
  docId: string
  groupVariantCategory?: string
  id: string
  version?: string
  latestVersion?: string
  hasDraft: undefined | Document
  groupId: string
  pathName: string
  userRole: Role
  pub: HMPublication | undefined
  editors: Array<Account | string | undefined>
  author: Account | string | undefined
  onCopyUrl: () => void
  onRemoveFromCategory?: () => void
}) {
  const removeDoc = useRemoveDocFromGroup()
  const renameDialog = useAppDialog(RenamePubDialog)
  const addToCategoryDialog = useAppDialog(AddToCategoryDialog)
  const gwUrl = useGatewayUrl()
  if (!pub) return null
  const memberMenuItems = [
    {
      label: 'Remove from Group',
      icon: Trash,
      onPress: () => {
        removeDoc.mutate({groupId, pathName})
      },
      key: 'remove',
    },
    {
      label: 'Rename Short Path',
      icon: Pencil,
      onPress: () => {
        renameDialog.open({
          pathName,
          groupId,
          docTitle: pub.document?.title || '',
        })
      },
      key: 'rename',
    },
    // ...(onRemoveFromCategory
    //   ? [
    //       {
    //         key: 'remove-from-category',
    //         label: 'Remove from this Category',
    //         icon: X,
    //         onPress: onRemoveFromCategory,
    //       },
    //     ]
    //   : []),
    // {
    //   label: 'Add to Category',
    //   icon: PackageOpen,
    //   onPress: () => {
    //     addToCategoryDialog.open({groupId, docId, pathName})
    //   },
    //   key: 'add-to-category',
    // },
  ]
  const ownerId = pub.document?.author
  if (!ownerId) return null
  return (
    <>
      <PublicationListItem
        // debugId={id}
        publication={pub}
        editors={editors}
        author={author}
        hasDraft={hasDraft}
        pathName={pathName}
        onPathNamePress={
          userRole > 0
            ? () => {
                renameDialog.open({
                  pathName,
                  groupId,
                  docTitle: pub.document?.title || '',
                })
              }
            : undefined
        }
        variants={[{key: 'group', groupId, pathName}]}
        menuItems={() => [
          copyLinkMenuItem(onCopyUrl, 'Group Publication'),
          ...(userRole != Role.ROLE_UNSPECIFIED ? memberMenuItems : []),
        ]}
        openRoute={{
          key: 'publication',
          documentId: docId,
          groupVariantCategory,
          ...(latestVersion === version
            ? {variants: [{key: 'group', groupId, pathName}]}
            : {
                versionId: version,
                variants: [{key: 'author', author: ownerId}],
              }),
        }}
      />
      {renameDialog.content}
      {addToCategoryDialog.content}
    </>
  )
}

function InviteMemberButton(props: React.ComponentProps<typeof Button>) {
  return (
    <Button icon={PlusCircle} size="$2" {...props}>
      Invite Editor
    </Button>
  )
}

function normalizeAccountId(accountId: string) {
  if (accountId.length === 48) return accountId
  const fromUrl = unpackHmId(accountId)
  if (fromUrl && fromUrl.type === 'a') return fromUrl.eid
}

type AccountListItem = {
  id: string
  profile?: Profile
  alias?: string
  devices: any
  isTrusted: boolean
}

function InviteMemberDialog({
  input,
  onClose,
}: {
  input: {groupId: string}
  onClose: () => void
}) {
  const addMember = useAddGroupMember()
  const accounts = useAllAccounts(true)

  const accountsMap = useMemo(
    () =>
      accounts.status == 'success'
        ? accounts.data.accounts.reduce((acc, current) => {
            if (current?.profile?.alias) {
              acc[current.id] = {...current, alias: current?.profile?.alias}
            }

            return acc
          }, {})
        : {},
    [accounts.status, accounts.data],
  )
  let accountsListValues = Object.values(accountsMap)

  const [selectedMembers, setMemberSelection] = useState<Array<string>>([])
  const [value, setValue] = useState('')

  const searchValue = useDeferredValue(value)

  const matches = useMemo(() => {
    return matchSorter(accountsListValues, searchValue, {
      // baseSort: (a, b) => (a.index < b.index ? -1 : 1),
      keys: ['id', 'alias'],
    })
      .slice(0, 10)
      .map((v: any) => v.id)
  }, [accountsListValues, searchValue])

  return (
    <>
      <Form
        onSubmit={() => {
          if (!selectedMembers.length) {
            toast.error('Empty selection')
            return
          }

          addMember
            .mutateAsync({
              groupId: input.groupId,
              members: selectedMembers,
            })
            .then(() => {
              onClose()
              toast.success('Members added to group')
            })
            .catch((error) => {
              toast.error('Error when adding members: ', error)
            })
        }}
      >
        <DialogTitle>Add Group Editor</DialogTitle>
        <YStack paddingVertical="$3">
          <Label>Contacts</Label>
          <TagInput
            label="Accounts"
            value={value}
            onChange={setValue}
            values={selectedMembers}
            onValuesChange={setMemberSelection}
            placeholder="Search by alias..."
            accountsMap={accountsMap}
          >
            {matches.map((value) => (
              <TagInputItem
                key={value}
                value={value}
                account={accountsMap[value]}
              />
            ))}
            {matches.length == 0 ? (
              <TagInputItem
                onClick={() => {
                  let unpackedId = unpackHmId(value)
                  const eid = unpackedId?.eid
                  if (eid && unpackedId?.type == 'a') {
                    setMemberSelection((values) => [...values, eid])
                  }
                }}
              >
                Add &quot;{value}&quot;
              </TagInputItem>
            ) : null}
          </TagInput>
        </YStack>
        <YStack gap="$3">
          <DialogDescription gap="$3">
            <SizableText>
              Search for member alias, or paste member ID
            </SizableText>
          </DialogDescription>
          <Form.Trigger asChild>
            <Button>Add Member</Button>
          </Form.Trigger>
        </YStack>
      </Form>
    </>
  )
}

function FrontPublicationDisplay({
  urlWithVersion,
  groupTitle,
}: {
  urlWithVersion: string
  groupTitle: string
}) {
  const route = useNavRoute()
  const groupRoute = route.key === 'group' ? route : undefined
  const unpacked = unpackDocId(urlWithVersion)
  const pub = usePublication({
    id: unpacked?.docId || '',
    version: unpacked?.version || '',
  })

  return pub.status == 'success' && pub.data ? (
    <YStack
      width="100%"
      maxWidth="calc(90ch + 20vw)"
      paddingHorizontal="$5"
      alignSelf="center"
    >
      {pub.data?.document?.title && groupTitle !== pub.data?.document?.title ? (
        <Heading
          size="$1"
          fontSize={'$2'}
          paddingHorizontal="$5"
          $gtMd={{
            paddingHorizontal: '$6',
          }}
        >
          {pub.data?.document?.title}
        </Heading>
      ) : null}
      <AppPublicationContentProvider
        routeParams={{blockRef: groupRoute?.blockId}}
      >
        <PublicationContent publication={pub.data} />
      </AppPublicationContentProvider>
    </YStack>
  ) : null
}

function useRoughTime(): bigint {
  // hook that provides time in seconds, updates every 5 seconds
  const [time, setTime] = useState(BigInt(Math.round(Date.now() / 1000)))
  const timer = useRef<NodeJS.Timeout | null>(null)
  const updateTime = () => {
    setTime(BigInt(Math.round(Date.now() / 1000)))
  }
  useEffect(() => {
    timer.current = setInterval(updateTime, 5_000)
    return () => {
      if (timer.current) clearInterval(timer.current)
    }
  }, [])
  return time
}

const GroupStatus = {
  SyncedConnected: {
    color: 'green',
    message: (g: Group) =>
      `Synced and Connected to ${hostnameStripProtocol(g.siteInfo?.baseUrl)}`,
  },
  UnsyncedConnected: {color: 'orange', message: (g: Group) => `Syncing`},
  Disconnected: {
    color: 'gray',
    message: (g: Group) =>
      g.siteInfo?.lastOkSyncTime && g.siteInfo?.lastOkSyncTime?.seconds !== 0n
        ? `Last Synced ${formattedDate(g.siteInfo.lastOkSyncTime)}`
        : `Not Connected`,
  },
} as const

function ChangesFooterItem({route}: {route: GroupRoute}) {
  const timeline = useEntityTimeline(route.groupId)
  const count = timeline.data?.timelineEntries.length || 0
  const replace = useNavigate('replace')
  return (
    <FooterButton
      active={route.accessory?.key === 'versions'}
      label={`${count} ${pluralS(count, 'Version')}`}
      icon={Pencil}
      onPress={() => {
        if (route.accessory) return replace({...route, accessory: null})
        replace({...route, accessory: {key: 'versions'}})
      }}
    />
  )
}

// export function EntityChangesAccessory({
//   id,
//   accessory,
// }: {
//   id: UnpackedHypermediaId | null
//   accessory: EntityVersionsAccessory | undefined | null
// }) {
//   const timeline = useEntityTimeline(
//     (id && createHmId(id.type, id.eid)) || undefined,
//   )
//   if (accessory?.key !== 'versions') return null
//   return (
//     <AccessoryContainer title="Changes">
//       <Text>Changes of {JSON.stringify(timeline.data)}</Text>
//     </AccessoryContainer>
//   )
// }

export interface TagInputProps extends Omit<Ariakit.ComboboxProps, 'onChange'> {
  label: string
  value?: string
  onChange?: (value: string) => void
  defaultValue?: string
  values?: Array<string>
  onValuesChange?: (values: Array<string>) => void
  defaultValues?: Array<AccountListItem>
  accountsMap: Record<string, AccountListItem>
}

export const TagInput = forwardRef<HTMLInputElement, TagInputProps>(
  function TagInput(props, ref) {
    const {
      label,
      defaultValue,
      value,
      onChange,
      defaultValues,
      values,
      onValuesChange,
      children,
      accountsMap,
      ...comboboxProps
    } = props

    const comboboxRef = useRef<HTMLInputElement>(null)
    const defaultComboboxId = useId()
    const comboboxId = comboboxProps.id || defaultComboboxId

    const combobox = Ariakit.useComboboxStore({
      value,
      defaultValue,
      setValue: onChange,
      resetValueOnHide: true,
    })

    const select = Ariakit.useSelectStore<any>({
      combobox,
      value: values,
      defaultValue: defaultValues,
      setValue: onValuesChange,
    })

    const composite = Ariakit.useCompositeStore({
      defaultActiveId: comboboxId,
    })

    const selectedValues = select.useState('value')

    // Reset the combobox value whenever an item is checked or unchecked.
    useEffect(() => combobox.setValue(''), [selectedValues, combobox])

    const toggleValueFromSelectedValues = (value: string) => {
      select.setValue((prevSelectedValues) => {
        const index = prevSelectedValues.indexOf(value)
        if (index !== -1) {
          return prevSelectedValues.filter((v: string) => v != value)
        }
        return [...prevSelectedValues, value]
      })
    }

    const onItemClick = (value: string) => () => {
      toggleValueFromSelectedValues(value)
    }

    const onItemKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === 'Backspace' || event.key === 'Delete') {
        event.currentTarget.click()
      }
    }

    const onInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key !== 'Backspace') return
      const {selectionStart, selectionEnd} = event.currentTarget
      const isCaretAtTheBeginning = selectionStart === 0 && selectionEnd === 0
      if (!isCaretAtTheBeginning) return
      select.setValue((values) => {
        if (!values.length) return values
        return values.slice(0, values.length - 1)
      })
      combobox.hide()
    }

    return (
      <Ariakit.Composite
        store={composite}
        role="grid"
        aria-label={label}
        className="tag-grid"
        onClick={() => comboboxRef.current?.focus()}
        render={
          <XStack
            // borderColor="$borderColor"
            // borderWidth={1}
            borderRadius="$2"
            padding="$1"
            backgroundColor="$backgroundStrong"
          />
        }
      >
        <Ariakit.CompositeRow
          role="row"
          render={<XStack gap="$1" width="100%" flexWrap="wrap" />}
        >
          {selectedValues.map((value) => {
            let account = accountsMap[value]
            let alias =
              account && account?.profile?.alias ? account.profile.alias : value
            let avatar = account?.profile?.avatar
            return (
              // <AccountCard accountId={value} key={value}>
              <Ariakit.CompositeItem
                key={value}
                role="gridcell"
                onClick={onItemClick(value)}
                onKeyDown={onItemKeyDown}
                onFocus={combobox.hide}
                render={
                  <XStack
                    gap="$2"
                    padding="$1.5"
                    minHeight="2rem"
                    borderRadius="$1"
                    backgroundColor="$backgroundFocus"
                    borderColor="$borderColor"
                    alignItems="center"
                    hoverStyle={{
                      cursor: 'pointer',
                      backgroundColor: '$color7',
                    }}
                  />
                }
              >
                <Avatar
                  label={alias}
                  id={value}
                  url={avatar ? `${API_FILE_URL}/${avatar}` : undefined}
                />
                <SizableText size="$3">
                  {alias
                    ? alias
                    : value.length > 20
                    ? `${value?.slice(0, 5)}...${value?.slice(-5)}`
                    : value}
                </SizableText>
                {/* <span className="tag-remove"></span> */}
                <X size={12} />
              </Ariakit.CompositeItem>
              // </AccountCard>
            )
          })}
          <YStack role="gridcell" flex={1}>
            <Ariakit.CompositeItem
              id={comboboxId}
              render={
                <CompositeInput
                  ref={comboboxRef}
                  onKeyDown={onInputKeyDown}
                  render={
                    <Ariakit.Combobox
                      ref={ref}
                      store={combobox}
                      autoSelect
                      className="combobox"
                      {...comboboxProps}
                    />
                  }
                />
              }
            />
          </YStack>
          <Ariakit.ComboboxPopover
            store={combobox}
            portal
            sameWidth
            gutter={8}
            render={
              <Ariakit.SelectList
                store={select}
                render={
                  <YGroup
                    zIndex={100000}
                    backgroundColor="$background"
                    separator={<Separator />}
                  />
                }
              />
            }
          >
            {children}
          </Ariakit.ComboboxPopover>
        </Ariakit.CompositeRow>
      </Ariakit.Composite>
    )
  },
)

export interface TagInputItemProps extends Ariakit.SelectItemProps {
  children?: React.ReactNode
  account?: AccountListItem
}

export const TagInputItem = forwardRef<HTMLDivElement, TagInputItemProps>(
  function TagInputItem(props, ref) {
    let label = useMemo(() => {
      if (!props.account)
        return (
          `${props.value?.slice(0, 5)}...${props.value?.slice(-5)}` || 'account'
        )

      return (
        props.account.alias ||
        `${props.value?.slice(0, 5)}...${props.value?.slice(-5)}` ||
        'account'
      )
    }, [props.account, props.value])
    return (
      <Ariakit.SelectItem
        ref={ref}
        {...props}
        render={
          <Ariakit.ComboboxItem
            render={
              <TagInputItemContent
                className="combobox-item"
                render={props.render}
              />
            }
          />
        }
      >
        <XStack gap="$2" flex={1}>
          <Ariakit.SelectItemCheck />
          <Avatar
            label={props.account?.alias}
            id={props.value}
            url={
              props.account?.profile?.avatar
                ? `${API_FILE_URL}/${props.account?.profile?.avatar}`
                : undefined
            }
          />
          <XStack flex={1}>
            <SizableText size="$3" color="currentColor">
              {props.children || label}
            </SizableText>
          </XStack>
        </XStack>
      </Ariakit.SelectItem>
    )
  },
)

const TagInputItemContent = forwardRef<any, any>(
  function TagInputItemContent(props, ref) {
    let {render, children, ...restProps} = props

    return (
      <YGroup.Item>
        <ListItem ref={ref} {...restProps} className="combobox-item">
          {render ? render : children}
        </ListItem>
      </YGroup.Item>
    )
  },
)
