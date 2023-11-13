import {copyUrlToClipboardWithFeedback} from '@mintter/app/copy-to-clipboard'
import {useMyAccount} from '@mintter/app/models/accounts'
import {getDefaultShortname, useDraftTitle} from '@mintter/app/models/documents'
import {
  useAccountGroups,
  useDocumentGroups,
  useGroup,
  useMyGroups,
  usePublishDocToGroup,
} from '@mintter/app/models/groups'
import {usePublicationInContext} from '@mintter/app/models/publication'
import {RenamePubDialog} from '@mintter/app/pages/group'
import {usePopoverState} from '@mintter/app/use-popover-state'
import {
  DraftRoute,
  GroupPublicationRouteContext,
  GroupRoute,
  NavContextProvider,
  NavRoute,
  PublicationRoute,
  useNavRoute,
  useNavigation,
} from '@mintter/app/utils/navigation'
import {pathNameify} from '@mintter/app/utils/path'
import {useNavigate} from '@mintter/app/utils/useNavigate'
import {
  UnpackedHypermediaId,
  createPublicWebHmUrl,
  labelOfEntityType,
  shortenPath,
  unpackHmId,
} from '@mintter/shared'
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
  Globe,
  Input,
  Label,
  Popover,
  PopoverTrigger,
  Select,
  SizableText,
  Spinner,
  Text,
  Tooltip,
  View,
  XStack,
  YStack,
  styled,
} from '@mintter/ui'
import {
  Book,
  Bookmark,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  Upload,
  X,
} from '@tamagui/lucide-icons'
import {useEffect, useState} from 'react'
import toast from 'react-hot-toast'
import CommitDraftButton from './commit-draft-button'
import {useAppDialog} from './dialog'
import DiscardDraftButton from './discard-draft-button'

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
    draftRoute.pubContext?.key === 'group' ? draftRoute.pubContext : null
  if (!groupRouteContext?.groupId) return null
  return (
    <Form
      onSubmit={() => {
        onClose()
        toast(pathNameify(renamed))
        replace({
          ...draftRoute,
          pubContext: {
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

function GroupPublishDialog({
  input,
  dialogState,
}: {
  input: {
    docId: string
    version: string | undefined
    editDraftId?: string | undefined
    docTitle: string | undefined
  }
  dialogState: DialogProps
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
  if (!myGroups) return <Spinner />
  return (
    <Form
      onSubmit={() => {
        console.log('submit ' + selectedGroupId)
        if (!selectedGroupId) {
          toast.error('Please select a group')
          return
        }
        if (pubRoute && input.version && !input.editDraftId) {
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
                    pubContext: {
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
              dialogState.onOpenChange?.(false)
            })
        } else if (draftRoute) {
          // we are in a draft and we are only setting the group ID and pathName in the route
          navigate({
            ...draftRoute,
            pubContext: {
              key: 'group',
              groupId: selectedGroupId,
              pathName,
            },
          })
          dialogState.onOpenChange?.(false)
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
              // to do animations:
              animation="quick"
              animateOnly={['transform', 'opacity']}
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

function ContextPopover({...props}) {
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
const ContextPopoverContent = styled(Popover.Content, {
  padding: '$2',
  name: 'ContextPopoverContent',
  borderWidth: 1,
  borderColor: '$borderColor',
  backgroundColor: '$background',
  elevation: '$2',
  enterStyle: {y: -10, opacity: 0},
  exitStyle: {y: -10, opacity: 0},
  elevate: true,
  animation: [
    'fast',
    {
      opacity: {
        overshootClamping: true,
      },
    },
  ],
})

const ContextPopoverArrow = styled(Popover.Arrow, {
  name: 'ContextPopoverArrow',
  borderWidth: 1,
  backgroundColor: '$borderColor',
})

function GroupContextButton({route}: {route: GroupRoute}) {
  const group = useGroup(route.groupId)
  if (!group.data) return null
  return (
    <>
      <Button size="$2" icon={Book} disabled>
        {group.data.title}
      </Button>
      <VersionContext route={route} />
    </>
  )
}

function DraftContextButton({route}: {route: DraftRoute}) {
  const dialogState = usePopoverState(false)
  const account = useMyAccount()
  const nav = useNavigate('replace')
  const groups = useAccountGroups(account?.data?.id)
  const draftTitle = useDraftTitle({documentId: route.draftId})
  const groupPubContext =
    route.pubContext?.key === 'group' ? route.pubContext : null
  const myPublishableGroups = groups.data?.items
  const selectedGroup = groupPubContext
    ? myPublishableGroups?.find(
        (item) => item.group?.id === groupPubContext.groupId,
      )
    : undefined
  let icon = Globe
  let title = ''
  if (route.pubContext?.key === 'trusted') {
    icon = Bookmark
  } else if (route.pubContext?.key === 'group' && selectedGroup) {
    icon = Book
    title = selectedGroup.group?.title || ''
  }
  const [isListingGroups, setIsListingGroups] = useState(false)
  let displayPathName =
    route.pubContext?.key === 'group' ? route.pubContext?.pathName : undefined
  if (!displayPathName && route.draftId) {
    displayPathName = getDefaultShortname(draftTitle, route.draftId)
  }
  useEffect(() => {
    if (
      !selectedGroup &&
      myPublishableGroups &&
      route.pubContext?.key === 'group'
    ) {
      nav({...route, pubContext: null})
    }
  }, [selectedGroup, myPublishableGroups, route])
  const shortRename = useAppDialog(RenameShortnameDialog)
  const draftId = route.draftId
  if (!draftId) return null
  return (
    <>
      <ContextPopover {...dialogState}>
        <PopoverTrigger asChild>
          <Button size="$2" icon={icon}>
            {title}
          </Button>
        </PopoverTrigger>
        <ContextPopoverContent>
          <ContextPopoverArrow />
          <YStack space="$2">
            {groupPubContext ? (
              <>
                <SizableText size="$2">Committing to Group:</SizableText>
                <GroupContextItem
                  groupId={groupPubContext.groupId}
                  path={displayPathName || null}
                  onPathPress={() => {
                    if (!groupPubContext.pathName) return
                    shortRename.open({
                      draftId,
                      groupId: groupPubContext.groupId,
                      pathName: groupPubContext.pathName,
                      docTitle: draftTitle,
                    })
                  }}
                  route={route}
                />
              </>
            ) : null}

            <ContextButton
              icon={Globe}
              name="Publish Independently"
              route={{...route, pubContext: null}}
              isActive={route.pubContext?.key !== 'group'}
            />
            <Button
              size="$3"
              icon={Book}
              onPress={() => {
                nav({...route, pubContext: null})
                setIsListingGroups((is) => !is)
              }}
              justifyContent="flex-start"
              color={'$color11'}
              chromeless
              iconAfter={isListingGroups ? ChevronUp : ChevronDown}
            >
              Publish to Group...
            </Button>
            {isListingGroups &&
              (groups.data?.items?.length === 0 ? (
                <Text>You have no groups yet</Text>
              ) : (
                groups.data?.items?.map((item) => {
                  const groupId = item.group?.id
                  if (!groupId) return null
                  const isActive =
                    groupPubContext?.key === 'group' &&
                    selectedGroup?.group?.id === groupId &&
                    groupId === groupPubContext.groupId
                  return (
                    <Button
                      key={groupId}
                      size="$2"
                      marginHorizontal="$2"
                      justifyContent="flex-start"
                      icon={Book}
                      onPress={() => {
                        setIsListingGroups(false)
                        nav({
                          ...route,
                          pubContext: {key: 'group', groupId, pathName: ''},
                        })
                      }}
                      iconAfter={isActive ? CheckCheck : undefined}
                    >
                      {item.group?.title}
                    </Button>
                  )
                })
              ))}
          </YStack>
        </ContextPopoverContent>
      </ContextPopover>
      {shortRename.content}
    </>
  )
}

function GroupContextItem({
  groupId,
  path,
  route,
  onPathPress,
}: {
  groupId: string
  path: string | null
  route: PublicationRoute | DraftRoute
  onPathPress?: (() => void) | undefined
}) {
  const replaceRoute = useNavigate('replace')
  const group = useGroup(groupId)
  const isActive =
    route.pubContext?.key === 'group' &&
    groupId === route.pubContext.groupId &&
    (path === route.pubContext.pathName || route.pubContext.pathName === '')
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
      flex={1}
      minHeight={50}
      color={isActive ? '$blue11' : '$color12'}
      disabled={isActive}
      onPress={() => {
        replaceRoute({
          ...route,
          ...(route.key === 'publication'
            ? {
                versionId: undefined,
              }
            : {}),
          pubContext: {
            key: 'group',
            groupId: groupId,
            pathName: path,
          },
        })
      }}
    >
      <XStack gap="$2" jc="space-between" flex={1} ai="center" mr={-8}>
        <YStack alignItems="flex-start">
          <SizableText
            fontSize={path === '/' ? '$3' : '$2'}
            color={isActive ? '$blue11' : '$color12'}
          >
            {group.data?.title}
          </SizableText>
          {path === '/' || path == null ? null : (
            <ButtonText
              fontSize={10}
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
              /{shortenPath(path)}
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

function ContextButton({
  name,
  route,
  icon,
  isActive,
}: {
  name: string
  icon: typeof Globe
  isActive: boolean
  route: NavRoute
}) {
  const replaceRoute = useNavigate('replace')
  return (
    <Button
      size="$3"
      icon={icon}
      onPress={() => {
        replaceRoute(route)
      }}
      justifyContent="flex-start"
      color={isActive ? '$blue11' : '$color11'}
      chromeless
      aria-selected={isActive}
    >
      <XStack space mr={-8} ai="center" jc="space-between" f={1}>
        <SizableText color={isActive ? '$blue11' : '$color11'}>
          {name}
        </SizableText>
        <Check color={isActive ? '$blue11' : 'transparent'} size="$1" />
      </XStack>
    </Button>
  )
}

function VersionContext({route}: {route: NavRoute}) {
  let exactVersion: string | null = null
  let fullUrl: string | null = null
  const navigate = useNavigate()
  let unpackedId: UnpackedHypermediaId | null = null
  let routeWithoutVersion: NavRoute | null = null
  let latestVersionLabel = 'Latest Version'
  if (route.key === 'group') {
    const {groupId, accessory, version} = route
    unpackedId = unpackHmId(groupId)
    exactVersion = version || null
    routeWithoutVersion = {
      key: 'group',
      groupId,
      accessory,
      version: undefined,
    }
  } else if (route.key === 'publication') {
    const {accessory, documentId, versionId, pubContext} = route
    unpackedId = unpackHmId(documentId)
    exactVersion = versionId || null
    routeWithoutVersion = {
      key: 'publication',
      documentId,
      accessory,
      versionId: undefined,
      pubContext,
    }
    if (pubContext?.key === 'group') {
      latestVersionLabel = 'Latest Version in this Group'
    }
    if (pubContext?.key === 'trusted') {
      latestVersionLabel = 'Latest Version from Trusted Authors'
    }
  }
  fullUrl =
    unpackedId &&
    exactVersion &&
    createPublicWebHmUrl(unpackedId.type, unpackedId.eid, {
      version: exactVersion,
    })
  if (!unpackedId || !exactVersion || !fullUrl) return null
  return (
    <>
      <Tooltip
        content={`You are viewing the exact version: @${exactVersion.slice(
          -6,
        )}. Click to Copy Version URL`}
      >
        <ButtonText
          hoverStyle={{textDecorationLine: 'underline'}}
          onPress={() => {
            if (!unpackedId || !exactVersion || !fullUrl) return
            copyUrlToClipboardWithFeedback(
              fullUrl,
              `Exact ${labelOfEntityType(unpackedId.type)} Version`,
            )
          }}
          color={'$color10'}
          fontFamily={'$mono'}
          fontSize="$2"
        >
          @{exactVersion.slice(-6)}
        </ButtonText>
      </Tooltip>
      {routeWithoutVersion ? (
        <Tooltip content={`View ${latestVersionLabel}`}>
          <Button
            size="$2"
            chromeless
            onPress={() => {
              routeWithoutVersion && navigate(routeWithoutVersion)
            }}
            icon={X}
          />
        </Tooltip>
      ) : null}
    </>
  )
}

function PublicationContextButton({route}: {route: PublicationRoute}) {
  const publication = usePublicationInContext({
    documentId: route.documentId,
    versionId: route.versionId,
    pubContext: route.pubContext,
  })
  const {pubContext} = route
  const groupPubContext = pubContext?.key === 'group' ? pubContext : null
  const contextGroup = useGroup(groupPubContext?.groupId)
  let icon = Globe
  let title = ''
  if (pubContext?.key === 'trusted') {
    icon = Bookmark
  } else if (pubContext?.key === 'group') {
    icon = Book
    title = contextGroup.data?.title || ''
  }
  const docId = route.documentId
  const docVersion = route.versionId || publication.data?.version
  const docGroups = useDocumentGroups(route.documentId)
  const popoverState = usePopoverState(false)
  const navigate = useNavigate()
  const publishDialogState = usePopoverState(false, (isOpen) => {
    isOpen && popoverState.onOpenChange(false)
  })
  const renameDialog = useAppDialog(RenamePubDialog)
  const contextDestRoute: NavRoute | null = groupPubContext?.groupId
    ? {
        key: 'group',
        groupId: groupPubContext.groupId,
      }
    : null
  return (
    <>
      <XStack space="$2" ai="center">
        <ContextPopover {...popoverState}>
          <PopoverTrigger asChild>
            <Button size="$2" icon={icon}>
              {contextDestRoute ? (
                <ButtonText
                  hoverStyle={
                    popoverState.open ? {textDecorationLine: 'underline'} : {}
                  }
                  fontSize="$2"
                  onPress={(e) => {
                    if (!popoverState.open) return
                    e.stopPropagation()
                    navigate(contextDestRoute)
                  }}
                >
                  {title}
                </ButtonText>
              ) : (
                title
              )}
            </Button>
          </PopoverTrigger>
          <ContextPopoverContent>
            <ContextPopoverArrow />
            <YStack space="$2">
              <ContextButton
                icon={Globe}
                name="All Authors"
                route={{...route, pubContext: null}}
                isActive={!route.pubContext?.key}
              />
              <ContextButton
                icon={Bookmark}
                name="Trusted Authors"
                route={{...route, pubContext: {key: 'trusted'}}}
                isActive={route.pubContext?.key === 'trusted'}
              />
              {docGroups.data?.length ? (
                <>
                  <SizableText size="$2" marginVertical="$2">
                    Appears in:
                  </SizableText>
                  <YStack gap="$2">
                    {docGroups.data?.map((docGroup) => {
                      return (
                        <GroupContextItem
                          groupId={docGroup.groupId}
                          path={docGroup.path}
                          route={route}
                          onPathPress={() => {
                            renameDialog.open({
                              groupId: docGroup.groupId,
                              pathName: docGroup.path,
                              docTitle: publication.data?.document?.title || '',
                            })
                          }}
                          key={`${docGroup.groupId}-${docGroup.path}`}
                        />
                      )
                    })}
                  </YStack>
                </>
              ) : null}
            </YStack>
          </ContextPopoverContent>
        </ContextPopover>
        {route.versionId !== undefined ? (
          <VersionContext route={route} />
        ) : null}
        <PublishDialogInstance
          docId={docId}
          version={docVersion}
          docTitle={publication.data?.document?.title}
          groupPubContext={
            route.pubContext?.key === 'group' ? route.pubContext : null
          }
          {...publishDialogState}
        />
      </XStack>
      {renameDialog.content}
    </>
  )
}

export function PageContextButton({}: {}) {
  const route = useNavRoute()
  if (route.key === 'draft') {
    return <DraftContextButton route={route} />
  }
  if (route.key === 'publication') {
    return <PublicationContextButton route={route} />
  }
  if (route.key === 'group') {
    return <GroupContextButton route={route} />
  }
  return null
}

function PublishDialogInstance({
  closePopover,
  docId,
  version,
  editDraftId,
  groupPubContext,
  docTitle,
  ...props
}: DialogProps & {
  closePopover?: () => void
  docId: string
  version: string | undefined
  editDraftId?: string | undefined
  docTitle?: string | undefined
  groupPubContext: GroupPublicationRouteContext | null
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
      <Tooltip content="Publish to Group">
        <Dialog.Trigger asChild>
          <Button size="$2" icon={Upload} chromeless></Button>
        </Dialog.Trigger>
      </Tooltip>
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
              dialogState={props}
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
