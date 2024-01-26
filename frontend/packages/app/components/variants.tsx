import {useMyAccount} from '@mintter/app/models/accounts'
import {getDefaultShortname} from '@mintter/app/models/documents'
import {
  useAccountGroups,
  useGroup,
  useMyGroups,
  usePublishDocToGroup,
} from '@mintter/app/models/groups'
import {usePublicationVariant} from '@mintter/app/models/publication'
import {toast} from '@mintter/app/toast'
import {usePopoverState} from '@mintter/app/use-popover-state'
import {
  NavContextProvider,
  NavRoute,
  PublicationRoute,
  useNavRoute,
  useNavigation,
} from '@mintter/app/utils/navigation'
import {pathNameify} from '@mintter/app/utils/path'
import {useNavigate} from '@mintter/app/utils/useNavigate'
import {
  API_FILE_URL,
  HYPERMEDIA_ENTITY_TYPES,
  Publication,
  UnpackedHypermediaId,
  createPublicWebHmUrl,
  formattedDateMedium,
  shortenPath,
  unpackDocId,
  unpackHmId,
} from '@mintter/shared'
import {AuthorVersion} from '@mintter/shared/src/client/.generated/entities/v1alpha/entities_pb'
import {
  Button,
  ButtonText,
  Check,
  Dialog,
  DialogDescription,
  DialogProps,
  DialogTitle,
  Fieldset,
  Form,
  Input,
  Label,
  Popover,
  PopoverTrigger,
  Select,
  Separator,
  SizableText,
  Spinner,
  Tooltip,
  UIAvatar,
  View,
  XGroup,
  XStack,
  YStack,
} from '@mintter/ui'
import {
  ArrowRight,
  Book,
  ChevronDown,
  ChevronUp,
  Pencil,
  Upload,
} from '@tamagui/lucide-icons'
import {
  ComponentProps,
  PropsWithChildren,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {useAccount} from '../models/accounts'
import {useEntityTimeline} from '../models/changes'
import {useGatewayUrl} from '../models/gateway-settings'
import {useCurrentDocumentGroups} from '../models/groups'
import {getAccountName} from '../pages/account-page'
import {RenamePubDialog} from '../src/rename-publication-dialog'
import {GroupVariant, PublicationVariant} from '../utils/navigation'
import CommitDraftButton from './commit-draft-button'
import {useAppDialog} from './dialog'
import DiscardDraftButton from './discard-draft-button'
import {EditDocButton, useEditDraft} from './edit-doc-button'

export function RenameShortnameDialog({
  input: {groupId, pathName, docTitle, draftId},
  onClose,
}: {
  input: {groupId: string; pathName: string; docTitle?: string; draftId: string}
  onClose: () => void
}) {
  const [renamed, setRenamed] = useState(
    pathName || getDefaultShortname(docTitle, draftId),
  )
  const replace = useNavigate('replace')
  const route = useNavRoute()
  const draftRoute = route.key === 'draft' ? route : null
  const group = useGroup(groupId)
  if (!draftRoute) return null
  const groupRouteContext =
    draftRoute.variant?.key === 'group' ? draftRoute.variant : null
  if (!groupRouteContext?.groupId) return null
  return (
    <Form
      onSubmit={() => {
        onClose()
        toast(pathNameify(renamed))
        replace({
          ...draftRoute,
          variant: {
            key: 'group',
            groupId: groupRouteContext.groupId,
            pathName: renamed,
          },
        })
      }}
    >
      <DialogTitle>Publishing Short Path</DialogTitle>
      <DialogDescription>
        Draft will publish in the group <b>{group.data?.title}</b> with the
        following path name:
      </DialogDescription>
      <Input
        value={renamed}
        onChangeText={(value) => {
          setRenamed(
            value
              .toLocaleLowerCase()
              .replace(/\s+/g, '-')
              .replace(/[^a-z0-9-_]/g, '')
              .replace(/-{2,}/g, '-'),
          )
        }}
      />
      <Form.Trigger asChild>
        <Button>Save</Button>
      </Form.Trigger>
    </Form>
  )
}

export function GroupPublishDialog({
  input,
  onClose,
}: {
  input: {
    docId: string
    version?: string | undefined
    docTitle?: string | undefined
    onComplete?: () => void
    editDraftId?: string | undefined
  }
  onClose: () => void
}) {
  const account = useMyAccount()
  const accountId = account.data?.id
  const myGroups = useAccountGroups(accountId)
  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>()
  useEffect(() => {
    if (myGroups?.data?.items?.length && !selectedGroupId)
      setSelectedGroupId(myGroups.data?.items?.[0]?.group?.id)
  }, [myGroups.data, selectedGroupId])
  const defaultPathName = getDefaultShortname(input.docTitle || '', input.docId)
  const [pathName, setPathName] = useState(defaultPathName)
  const route = useNavRoute()
  const navigate = useNavigate('replace')
  const draftRoute = route.key === 'draft' ? route : null
  const pubRoute = route.key === 'publication' ? route : null
  const publishToGroup = usePublishDocToGroup()
  if (!myGroups.data || !selectedGroupId) return <Spinner />
  return (
    <Form
      onSubmit={() => {
        if (!selectedGroupId) {
          toast.error('Please select a group')
          return
        }
        if (pubRoute && input.version) {
          // we are in a publication and we are expected to immediately put this in the group
          toast
            .promise(
              publishToGroup
                .mutateAsync({
                  groupId: selectedGroupId,
                  docId: input.docId,
                  version: input.version,
                  pathName,
                })
                .then((didChange: boolean) => {
                  navigate({
                    ...pubRoute,
                    variant: {
                      key: 'group',
                      groupId: selectedGroupId,
                      pathName,
                    },
                  })
                  return didChange
                }),
              {
                loading: 'Publishing...',
                success: (result) => {
                  if (result) return 'Published to Group'
                  else return 'Already Published Here'
                },
                error: 'Failed to Publish!',
              },
            )
            .finally(() => {
              onClose()
              input.onComplete?.()
            })
        } else if (draftRoute) {
          // we are in a draft and we are only setting the group ID and pathName in the route
          navigate({
            ...draftRoute,
            variant: {
              key: 'group',
              groupId: selectedGroupId,
              pathName,
            },
          })
          onClose()
          input.onComplete?.()
        }
      }}
    >
      <DialogTitle>Publish to Group</DialogTitle>

      <Fieldset gap="$2" horizontal borderColor="transparent">
        <Label htmlFor="group">Group</Label>
        <Select
          id="group-id"
          value={selectedGroupId}
          onValueChange={setSelectedGroupId}
        >
          <Select.Trigger width={265}>
            <Select.Value placeholder="Select Group.." />
          </Select.Trigger>
          <Select.Content zIndex={200000}>
            <Select.ScrollUpButton
              alignItems="center"
              justifyContent="center"
              position="relative"
              width="100%"
              height="$3"
            >
              <YStack zIndex={10}>
                <ChevronUp size={20} />
              </YStack>
            </Select.ScrollUpButton>
            <Select.Viewport
              animation="fast"
              // animateOnly={['transform', 'opacity']}
              enterStyle={{opacity: 0, y: -10}}
              exitStyle={{opacity: 0, y: 10}}
              minWidth={200}
            >
              {myGroups?.data?.items?.map((item, index) => {
                if (!item.group) return null
                return (
                  <Select.Item
                    index={index}
                    value={item.group?.id}
                    key={item.group.id}
                  >
                    <Select.ItemText>{item.group.title}</Select.ItemText>
                  </Select.Item>
                )
              })}
            </Select.Viewport>

            <Select.ScrollDownButton
              alignItems="center"
              justifyContent="center"
              position="relative"
              width="100%"
              height="$3"
            >
              <YStack zIndex={10}>
                <ChevronDown size={20} />
              </YStack>
            </Select.ScrollDownButton>
          </Select.Content>
        </Select>
      </Fieldset>

      <Fieldset gap="$4" horizontal borderColor="transparent">
        <Label htmlFor="path">Path / Shortname</Label>
        <Input id="path" value={pathName} onChangeText={setPathName} />
      </Fieldset>

      <Form.Trigger asChild>
        <Button>Submit</Button>
      </Form.Trigger>
    </Form>
  )
}

export function ContextPopover({...props}) {
  return (
    <Popover
      size="$5"
      allowFlip={true}
      placement="bottom-start"
      keepChildrenMounted={true}
      {...props}
    />
  )
}

export function ContextPopoverTitle({
  children,
  ...props
}: PropsWithChildren<ComponentProps<typeof SizableText>>) {
  return (
    <SizableText
      marginTop="$2"
      size="$3"
      padding="$2"
      paddingHorizontal="$4"
      fontWeight="bold"
      {...props}
    >
      {children}
    </SizableText>
  )
}

export function ContextPopoverContent(props) {
  return (
    <Popover.Content
      padding={0}
      width={350}
      name={'ContextPopoverContent'}
      borderWidth={1}
      borderColor={'$borderColor'}
      backgroundColor={'$background'}
      elevation={'$2'}
      enterStyle={{y: -10, opacity: 0}}
      exitStyle={{y: -10, opacity: 0}}
      elevate
      animation={[
        'fast',
        {
          opacity: {
            overshootClamping: true,
          },
        },
      ]}
      {...props}
    />
  )
}

export function ContextPopoverArrow(props) {
  return (
    <Popover.Arrow
      name="ContextPopoverArrow"
      borderWidth={1}
      backgroundColor="$borderColor"
      {...props}
    />
  )
}

export function GroupVariantItem({
  groupId,
  path,
  onPress,
  onPathPress,
  isActive,
  isVersionMatched,
}: {
  groupId: string
  path: string | null
  onPress?: () => void
  onPathPress?: (() => void) | undefined
  isActive?: boolean
  isVersionMatched?: boolean
}) {
  const group = useGroup(groupId)
  const myGroups = useMyGroups()
  const isGroupMember = myGroups.data?.items?.find((groupAccount) => {
    return groupAccount.group?.id === groupId
  })
  const isPathPressable = isActive && isGroupMember && onPathPress
  return (
    <Button
      size="$3"
      justifyContent="flex-start"
      icon={Book}
      backgroundColor="transparent"
      flex={1}
      minHeight={50}
      color={isVersionMatched ? '$blue11' : '$color12'}
      disabled={isActive}
      onPress={onPress}
    >
      <XStack gap="$4" jc="space-between" flex={1} ai="center" mr={-8}>
        <YStack alignItems="flex-start">
          <SizableText
            fontSize={path === '/' ? '$3' : '$2'}
            color={isVersionMatched ? '$blue11' : '$color12'}
          >
            {group.data?.title}
          </SizableText>
          {path === '/' || path == null ? null : (
            <ButtonText
              fontSize="$1"
              color="$color11"
              disabled={!isPathPressable}
              onPress={
                isPathPressable
                  ? (e) => {
                      e.stopPropagation()
                      onPathPress()
                    }
                  : undefined
              }
              hoverStyle={
                isPathPressable
                  ? {
                      textDecorationLine: 'underline',
                    }
                  : {}
              }
            >
              {shortenPath(path)}
            </ButtonText>
          )}
        </YStack>
        <View style={{minWidth: 22}}>
          {isActive && <Check size="$1" color="$blue11" />}
        </View>
      </XStack>
    </Button>
  )
}

export function VersionContext({route}: {route: NavRoute}) {
  let exactVersion: string | null = null
  let fullUrl: string | null = null
  const navigate = useNavigate()
  let unpackedId: UnpackedHypermediaId | null = null
  let latestVersionRoute: NavRoute | null = null
  const gwUrl = useGatewayUrl()
  const pubRoute = route.key === 'publication' ? route : null
  const groupRoute = route.key === 'group' ? route : null
  const pub = usePublicationVariant({
    documentId: pubRoute?.documentId,
    variant: pubRoute?.variant,
    enabled: !!pubRoute?.documentId,
  })
  const group = useGroup(groupRoute?.groupId, {enabled: !!groupRoute?.groupId})
  if (route.key === 'group') {
    const {groupId, accessory, version} = route
    unpackedId = unpackHmId(groupId)
    exactVersion = version || null
    if (version && group.data.version && group.data.version !== version) {
      latestVersionRoute = {
        key: 'group',
        groupId,
        accessory,
        version: undefined,
      }
    }
  } else if (route.key === 'publication') {
    const {accessory, documentId, versionId, variant} = route
    unpackedId = unpackHmId(documentId)
    exactVersion = versionId || null
    if (
      versionId &&
      pub.data?.publication?.version &&
      pub.data?.publication?.version !== versionId
    ) {
      latestVersionRoute = {
        key: 'publication',
        documentId,
        accessory,
        versionId: undefined,
        variant,
      }
    }
  }
  fullUrl =
    unpackedId &&
    exactVersion &&
    createPublicWebHmUrl(unpackedId.type, unpackedId.eid, {
      version: exactVersion,
      hostname: gwUrl.data,
    })
  if (!unpackedId || !exactVersion || !fullUrl) return null
  if (!latestVersionRoute) return null
  return (
    <>
      <XStack gap="$2" ai="center">
        {latestVersionRoute ? (
          <View className="no-window-drag">
            <Tooltip
              content={`You are looking at an older version of this ${HYPERMEDIA_ENTITY_TYPES[
                unpackedId.type
              ].toLowerCase()}. Click to go to the latest in this variant`}
            >
              <Button
                size="$2"
                theme="blue"
                onPress={() => {
                  navigate(latestVersionRoute)
                }}
                iconAfter={ArrowRight}
              >
                Latest Version
              </Button>
            </Tooltip>
          </View>
        ) : null}
      </XStack>
    </>
  )
}

export function PublicationVariants({route}: {route: PublicationRoute}) {
  const publication = usePublicationVariant({
    documentId: route.documentId,
    versionId: route.versionId,
    variant: route.variant,
  })
  const {variant} = route
  const groupVariant = variant?.key === 'group' ? variant : null
  const [variantTab, setVariantTab] = useState(
    groupVariant ? 'groups' : 'authors',
  )
  const popoverState = usePopoverState(false, (isOpen) => {
    if (isOpen) setVariantTab(groupVariant ? 'groups' : 'authors')
  })
  const renameDialog = useAppDialog(RenamePubDialog)
  const myAccount = useMyAccount()
  const myGroups = useAccountGroups(myAccount.data?.id)
  const variantAuthors =
    variant?.key === 'authors' || !variant
      ? variant?.authors || [publication.data?.publication?.document?.author]
      : null
  const isAuthorVariantEditable =
    !!variantAuthors &&
    !!myAccount.data?.id &&
    variantAuthors.indexOf(myAccount.data.id) !== -1
  const isGroupVariantEditable =
    !!groupVariant &&
    !!myGroups.data?.items?.find(
      (item) => item.group?.id === groupVariant.groupId,
    )
  const showEditButton = isAuthorVariantEditable || isGroupVariantEditable
  return (
    <>
      <XGroup separator={<Separator vertical />}>
        <ContextPopover {...popoverState}>
          <XGroup.Item>
            <PopoverTrigger asChild>
              <Button size="$2" className="no-window-drag">
                <VariantState
                  variant={variant}
                  isOpen={popoverState.open}
                  publication={publication.data?.publication}
                />
              </Button>
            </PopoverTrigger>
          </XGroup.Item>
          <ContextPopoverContent>
            <ContextPopoverArrow />
            <YStack alignSelf="stretch">
              <ContextPopoverTitle marginVertical="$2">
                Select Variant
              </ContextPopoverTitle>
              <TabsView
                value={variantTab}
                onValue={(tab) => {
                  setVariantTab(tab)
                }}
                tabs={[
                  {
                    label: 'Authors',
                    key: 'authors',
                    element: (
                      <AuthorVariants
                        route={route}
                        publication={publication.data?.publication}
                      />
                    ),
                  },
                  {
                    label: 'Groups',
                    key: 'groups',
                    element: (
                      <GroupVariants
                        route={route}
                        publication={publication.data?.publication}
                        onCloseVariantPopover={() => {
                          popoverState.onOpenChange(false)
                        }}
                      />
                    ),
                  },
                ]}
              />
            </YStack>
          </ContextPopoverContent>
        </ContextPopover>
        {showEditButton && (
          <EditDocButton
            key="editActions"
            contextRoute={route}
            variant={route.variant || null}
            docId={route.documentId}
            baseVersion={route.versionId}
          />
        )}
      </XGroup>
      {renameDialog.content}
    </>
  )
}

function VariantState({
  variant,
  isOpen,
  publication,
}: {
  variant: PublicationVariant | undefined
  isOpen: boolean
  publication: Publication | undefined
}) {
  if (variant?.key === 'group')
    return <GroupVariantState variant={variant} isOpen={isOpen} />
  return (
    <AuthorVariantState
      variant={variant}
      publication={publication}
      isOpen={isOpen}
    />
  )
  // {contextDestRoute ? (
  //   <ButtonText
  //     hoverStyle={
  //       popoverState.open ? {textDecorationLine: 'underline'} : {}
  //     }
  //     fontSize="$2"
  //     onPress={(e) => {
  //       if (!popoverState.open) return
  //       e.stopPropagation()
  //       navigate(contextDestRoute)
  //     }}
  //   >
  //     {title}
  //   </ButtonText>
  // ) : (
  //   title
  // )}
}

function GroupVariantState({
  variant,
  isOpen,
}: {
  variant: GroupVariant
  isOpen: boolean
}) {
  const group = useGroup(variant.groupId)
  const navigate = useNavigate()
  return (
    <XStack gap="$2" ai="center">
      <Book size={16} />
      <ButtonText
        size="$2"
        disabled={!isOpen}
        hoverStyle={{
          textDecorationLine: isOpen ? 'underline' : 'none',
        }}
        onPress={() => {
          navigate({
            key: 'group',
            groupId: variant.groupId,
          })
        }}
      >
        {group.data?.title}
      </ButtonText>
    </XStack>
  )
}

function AuthorVariantState({
  variant,
  isOpen,
  publication,
}: {
  variant: PublicationVariant | undefined
  isOpen: boolean
  publication: Publication | undefined
}) {
  const authorsVariant = variant?.key === 'authors' ? variant : undefined
  const authors =
    variant?.key === 'group'
      ? undefined
      : authorsVariant?.authors || [publication?.document?.author]
  const firstAccount = useAccount(authors?.[0])
  if (!authors) return <SizableText>Variant</SizableText>
  return (
    <XStack gap="$2" ai="center">
      {authors.map(
        (author) => author && <AuthorIcon key={author} author={author} />,
      )}
      {authors.length === 1 ? (
        <SizableText size="$2">
          {getAccountName(firstAccount.data?.profile)}
        </SizableText>
      ) : null}
    </XStack>
  )
}

function AuthorIcon({author}: {author: string}) {
  const account = useAccount(author)
  return (
    <UIAvatar
      id={author}
      size={20}
      url={
        account.data?.profile?.avatar &&
        `${API_FILE_URL}/${account.data?.profile?.avatar}`
      }
      label={getAccountName(account.data?.profile) || author}
    />
  )
}

function AuthorVariantItem({
  authorVersion,
  route,
  publication,
  isMerged,
}: {
  authorVersion: AuthorVersion
  route: PublicationRoute
  publication: Publication | undefined
  isMerged?: boolean
}) {
  const authorsVariant = route.variant?.key === 'authors' ? route.variant : null
  const author = useAccount(authorVersion.author)
  const navigate = useNavigate()
  const activeAuthors =
    authorsVariant?.authors ||
    (publication?.document?.author && !route.variant
      ? [publication?.document?.author]
      : [])
  const isVariantActive = new Set(activeAuthors).has(authorVersion.author)
  const isActive =
    !!publication?.version && publication?.version === authorVersion.version
  const isOwner =
    !!publication?.document?.author &&
    publication.document.author === authorVersion.author
  const canPressCheck = activeAuthors.length > 1 || !isVariantActive
  return (
    <Button
      backgroundColor={'transparent'}
      padding="$1"
      group="item"
      paddingHorizontal="$2"
      onPress={() => {
        navigate({
          ...route,
          versionId: undefined,
          variant: {
            key: 'authors',
            authors: [authorVersion.author],
          },
        })
      }}
    >
      <XStack jc="space-between" f={1} gap="$4" ai="center">
        <XStack gap="$2" f={1} ai="center">
          <UIAvatar
            id={authorVersion.author}
            size={28}
            url={
              author.data?.profile?.avatar &&
              `${API_FILE_URL}/${author.data?.profile?.avatar}`
            }
            label={author.data?.profile?.alias || authorVersion.author}
          />
          <YStack>
            <XStack gap="$2" ai="center">
              <SizableText
                color={isActive ? '$blue11' : isMerged ? '$color10' : '$color'}
              >
                {getAccountName(author.data?.profile)}
              </SizableText>
              {isMerged ? (
                <Tooltip
                  content={`${getAccountName(
                    author.data?.profile,
                  )}'s latest changes have been merged into the current variant`}
                >
                  <XStack>
                    <Check size={16} color={'$color10'} />
                  </XStack>
                </Tooltip>
              ) : null}
              {isActive && !isVariantActive ? (
                <Tooltip
                  content={`${getAccountName(
                    author.data?.profile,
                  )} has the exact same version that you see now`}
                >
                  <XStack>
                    <Check size={16} color={'$blue11'} />
                  </XStack>
                </Tooltip>
              ) : null}
              {isOwner ? (
                <Tooltip
                  content={`${getAccountName(
                    author.data?.profile,
                  )} created this document and controls the default variant`}
                >
                  <XStack
                    borderWidth={1}
                    borderColor="$color8"
                    paddingHorizontal="$1"
                    borderRadius="$2"
                  >
                    <SizableText size="$1" color="$color10">
                      Owner
                    </SizableText>
                  </XStack>
                </Tooltip>
              ) : null}
            </XStack>
            <SizableText color="$color11" size="$1">
              {formattedDateMedium(authorVersion.versionTime)}
            </SizableText>
          </YStack>
        </XStack>
        <Button
          size="$2"
          chromeless
          paddingHorizontal="$1"
          onPress={(e) => {
            if (!canPressCheck) return
            e.stopPropagation()
            const newAuthors = isVariantActive
              ? activeAuthors.filter((a) => a !== authorVersion.author)
              : [...activeAuthors, authorVersion.author]
            navigate({
              ...route,
              versionId: undefined,
              variant: {
                key: 'authors',
                authors: newAuthors,
              },
            })
          }}
          borderColor="transparent"
          disabled={!canPressCheck}
          minWidth={30}
          hoverStyle={{
            borderColor: canPressCheck ? '$color11' : 'transparent',
          }}
          $group-item-hover={{
            borderColor: canPressCheck ? '$color8' : 'transparent',
          }}
        >
          <Check
            color={isVariantActive ? '$blue11' : 'transparent'}
            size="$1"
          />
        </Button>
      </XStack>
    </Button>
  )
}

function AuthorVariants({
  route,
  publication,
}: {
  route: PublicationRoute
  publication: Publication | undefined
}) {
  if (route.key !== 'publication') throw new Error('Uh')
  const timeline = useEntityTimeline(route.documentId)
  const myAccount = useMyAccount()
  const myVersion = timeline.data?.authorVersions.find(
    (authorVersion) => authorVersion.author === myAccount.data?.id,
  )
  const {handleEdit, hasExistingDraft} = useEditDraft(route.documentId, {
    version: publication?.version,
    contextRoute: route,
    variant: undefined, // this will result in author variant
    navMode: 'push',
  })
  const allChanges = timeline.data?.allChanges
  const thisVersion = publication?.version
  const authorVersions = timeline.data?.authorVersions
  const authorVersionsMergedMap = useMemo(() => {
    const map: Record<string, boolean> = Object.fromEntries(
      authorVersions?.map((authorVersion) => {
        if (authorVersion.version === thisVersion)
          return [authorVersion.version, false]
        const authorChanges = new Set(authorVersion.version.split('.'))
        const matchedChanges = new Set()
        let walkChanges = new Set(thisVersion?.split('.') || [])
        while (walkChanges.size && matchedChanges.size < authorChanges.size) {
          const stepDeps = new Set<string>()
          walkChanges.forEach((changeId) => {
            const change = allChanges?.[changeId]
            if (!change) return
            if (authorChanges.has(changeId)) matchedChanges.add(changeId)
            else change.deps.forEach((changeDep) => stepDeps.add(changeDep))
          })
          walkChanges = stepDeps
        }
        return [
          authorVersion.version,
          matchedChanges.size === authorChanges.size,
        ]
      }) || [],
    )
    return map
  }, [allChanges, thisVersion, authorVersions])
  return (
    <YStack gap="$2" padding="$2">
      {timeline.data?.authorVersions.map((authorVersion) => (
        <AuthorVariantItem
          key={authorVersion.author}
          route={route}
          authorVersion={authorVersion}
          publication={publication}
          isMerged={authorVersionsMergedMap[authorVersion.version]}
        />
      ))}
      {myVersion ? null : (
        <Button
          size="$2"
          onPress={handleEdit}
          theme={hasExistingDraft ? 'yellow' : undefined}
          chromeless
          icon={Pencil}
        >
          {hasExistingDraft ? 'Edit Variant Draft' : 'Create Variant'}
        </Button>
      )}
    </YStack>
  )
}

function GroupVariants({
  route,
  publication,
  onCloseVariantPopover,
}: {
  route: PublicationRoute
  publication: Publication | undefined
  onCloseVariantPopover: () => void
}) {
  if (route.key !== 'publication')
    throw new Error('GroupVariants only for publication route')
  const docGroups = useCurrentDocumentGroups(route.documentId)
  const replaceRoute = useNavigate('replace')
  const publishToGroupDialog = useAppDialog(GroupPublishDialog, {})
  return (
    <YStack gap="$2" padding="$2">
      {docGroups.data?.map((docGroup) => {
        const fullDocId = unpackDocId(docGroup.rawUrl)

        return (
          <GroupVariantItem
            groupId={docGroup.groupId}
            path={docGroup.path}
            isVersionMatched={
              !!publication?.version &&
              publication?.version === fullDocId?.version
            }
            isActive={
              route?.variant?.key === 'group' &&
              docGroup.groupId === route.variant.groupId &&
              (docGroup.path === route.variant.pathName ||
                route.variant.pathName === '')
            }
            key={`${docGroup.groupId}-${docGroup.path}`}
            onPress={() => {
              replaceRoute({
                ...route,
                variant: {
                  key: 'group',
                  groupId: docGroup.groupId,
                  pathName: docGroup.path,
                },
                versionId: undefined,
              })
            }}
          />
        )
      })}
      <Button
        size="$2"
        onPress={() => {
          onCloseVariantPopover()
          publishToGroupDialog.open({
            docId: route.documentId,
            version: publication?.version,
            docTitle: publication?.document?.title,
            onComplete: () => {
              publishToGroupDialog.close()
            },
          })
        }}
        chromeless
        icon={Upload}
      >
        Publish to Group...
      </Button>
      {publishToGroupDialog.content}
    </YStack>
  )
}

function TabsView({
  tabs,
  value,
  onValue,
}: {
  tabs: {key: string; label: string; element: React.ReactNode}[]
  value: string
  onValue: (tabKey: string) => void
}) {
  const activeTab = tabs.find((tab) => tab.key === value)
  return (
    <YStack>
      <XStack>
        {tabs.map((tab) => (
          <Button
            key={tab.key}
            size="$2"
            f={1}
            bg={tab.key === value ? '$blue4' : 'transparent'}
            onPress={() => {
              onValue(tab.key)
            }}
            borderRadius={0}
            borderWidth={0}
            borderBottomWidth={2}
            borderColor={tab.key === value ? '$blue8' : '$color8'}
            hoverStyle={{
              borderColor: tab.key === value ? '$blue8' : '$color8',
            }}
          >
            {tab.label}
          </Button>
        ))}
      </XStack>
      {activeTab?.element}
    </YStack>
  )
}

export function PageContextButton({}: {}) {
  const route = useNavRoute()
  if (route.key === 'publication') {
    return <PublicationVariants route={route} />
  }
  return null
}

export function PublishDialogInstance({
  closePopover,
  docId,
  version,
  editDraftId,
  groupVariant,
  docTitle,
  ...props
}: DialogProps & {
  closePopover?: () => void
  docId: string
  version: string | undefined
  editDraftId?: string | undefined
  docTitle?: string | undefined
  groupVariant: GroupVariant | null
}) {
  const nav = useNavigation()
  return (
    <Dialog
      modal
      {...props}
      onOpenChange={(open) => {
        props.onOpenChange?.(open)
        if (open) {
          closePopover?.()
        }
      }}
    >
      <Dialog.Trigger asChild>
        <Button size="$2" icon={Upload} className="no-window-drag" chromeless>
          Publish to Group...
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay
          key="overlay"
          animation="fast"
          opacity={0.5}
          enterStyle={{opacity: 0}}
          exitStyle={{opacity: 0}}
        />
        <Dialog.Content
          bordered
          elevate
          key="content"
          animateOnly={['transform', 'opacity']}
          animation={[
            'fast',
            {
              opacity: {
                overshootClamping: true,
              },
            },
          ]}
          enterStyle={{x: 0, y: -20, opacity: 0, scale: 0.9}}
          exitStyle={{x: 0, y: 10, opacity: 0, scale: 0.95}}
          gap
        >
          <NavContextProvider value={nav}>
            <GroupPublishDialog
              input={{docId, version, editDraftId, docTitle}}
              onClose={() => closePopover?.()}
            />
          </NavContextProvider>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  )
}

export function DraftPublicationButtons() {
  return (
    <>
      <CommitDraftButton />
      <DiscardDraftButton />
    </>
  )
}
