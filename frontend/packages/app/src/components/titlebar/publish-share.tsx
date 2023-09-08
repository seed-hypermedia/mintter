import {useMyAccount} from '@mintter/app/models/accounts'
import {usePublication, usePublishDraft} from '@mintter/app/models/documents'
import {
  useDocumentGroups,
  useGroup,
  useGroups,
  usePublishDocToGroup,
} from '@mintter/app/models/groups'
import {useDaemonReady} from '@mintter/app/node-status-context'
import {usePopoverState} from '@mintter/app/use-popover-state'
import {
  GroupPublicationRouteContext,
  NavContextProvider,
  useNavRoute,
  useNavigate,
  useNavigation,
} from '@mintter/app/utils/navigation'
import {
  Button,
  Check,
  Dialog,
  DialogProps,
  DialogTitle,
  Fieldset,
  Form,
  Globe,
  Input,
  Label,
  Popover,
  Select,
  SizableText,
  Spinner,
  YStack,
} from '@mintter/ui'
import {ChevronDown, ChevronUp, Folder, X} from '@tamagui/lucide-icons'
import {useEffect, useMemo, useState} from 'react'
import toast from 'react-hot-toast'
import DiscardDraftButton from './discard-draft-button'

// function DraftPublicationDialog({
//   draft,
// }: {
//   draft?: EditorDraftState | undefined
// }) {
//   const sites = useSiteList()
//   const sitesList = sites.data || []
//   const foundSiteHostname = sitesList.find(
//     (site) => site.hostname === draft?.webUrl,
//   )
//   const writeSiteUrl = useWriteDraftWebUrl(draft?.id)

//   return (
//     <>
//       <SizableText size="$3" fontWeight="700" theme="mint">
//         Publish to:
//       </SizableText>
//       <Button
//         size="$4"
//         onPress={() => {
//           writeSiteUrl.mutate('')
//         }}
//         textProps={{flex: 1}}
//         icon={Globe}
//         iconAfter={foundSiteHostname == null ? Check : undefined}
//       >
//         Public Network
//       </Button>
//       {sitesList?.map((site) => {
//         return (
//           <Button
//             size="$4"
//             key={site.hostname}
//             onPress={() => {
//               writeSiteUrl.mutate(site.hostname)
//             }}
//             textProps={{flex: 1}}
//             icon={Globe}
//             iconAfter={
//               foundSiteHostname?.hostname === site.hostname ? Check : undefined
//             }
//           >
//             {hostnameStripProtocol(site.hostname)}
//           </Button>
//         )
//       })}
//     </>
//   )
// }

function GroupPublishDialog({
  input,
  dialogState,
}: {
  input: {
    docId: string
    version: string | undefined
    editDraftId?: string | undefined
  }
  dialogState: DialogProps
}) {
  const groupQuery = useGroups()
  const groups = groupQuery.data?.groups
  const account = useMyAccount()
  const accountId = account.data?.id
  const myGroups = useMemo(() => {
    if (!groups || !accountId) return undefined
    return groups.filter((group) => group.ownerAccountId === accountId)
  }, [groups, accountId])
  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>()
  useEffect(() => {
    if (myGroups?.length && !selectedGroupId)
      setSelectedGroupId(myGroups[0]?.id)
  }, [myGroups, selectedGroupId])
  const [pathName, setPathName] = useState(input.docId)
  const route = useNavRoute()
  const navigate = useNavigate('replace')
  const draftRoute = route.key === 'draft' ? route : null
  const pubRoute = route.key === 'publication' ? route : null
  const publishToGroup = usePublishDocToGroup()
  if (myGroups) {
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
                  .then(() => {
                    navigate({
                      ...pubRoute,
                      pubContext: {
                        key: 'group',
                        groupId: selectedGroupId,
                        pathName,
                      },
                    })
                  }),
                {
                  loading: 'Publishing...',
                  success: 'Published to Group',
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
        <Fieldset gap="$4" horizontal borderColor="transparent">
          <Label htmlFor="path">Path / Shortname</Label>
          <Input id="path" value={pathName} onChangeText={setPathName} />
        </Fieldset>

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
                {myGroups?.map((group, index) => (
                  <Select.Item index={index} value={group.id} key={group.id}>
                    <Select.ItemText>{group.title}</Select.ItemText>
                  </Select.Item>
                ))}
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

        <Form.Trigger asChild>
          <Button>Submit</Button>
        </Form.Trigger>
      </Form>
    )
  }

  return <Spinner />
}

export function PubContextButton({}: {}) {
  const route = useNavRoute()
  const nav = useNavigate('spawn')
  const documentId =
    route.key == 'publication'
      ? route.documentId
      : route.key == 'draft'
      ? route.draftId
      : undefined
  const routeVersion = route.key == 'publication' ? route.versionId : undefined
  const pubRoute = route.key === 'publication' ? route : null
  const draftRoute = route.key === 'draft' ? route : null
  const pubContext =
    route.key == 'publication'
      ? route.pubContext
      : route.key === 'draft'
      ? route.pubContext
      : undefined
  const {data: publication} = usePublication({
    documentId,
    versionId: routeVersion,
    enabled: !!documentId && route.key == 'publication',
  })
  const versionId = routeVersion || publication?.version
  // const isWebPub = publication?.document?.webUrl != null
  // const label = publication?.document?.webUrl
  //   ? hostnameStripProtocol(publication.document.webUrl)
  //   : 'Public'
  const popoverState = usePopoverState(false)
  const dialogState = usePopoverState(false)
  const {data: publishedGroups} = useDocumentGroups(documentId)

  const groupPubContext = pubContext?.key === 'group' ? pubContext : null
  const contextGroupId = groupPubContext?.groupId
  const group = useGroup(contextGroupId || undefined)
  if (route.key !== 'publication' && route.key !== 'draft') return null
  const groupTitle = group.data?.title

  return (
    <>
      <Popover
        size="$5"
        allowFlip
        placement="bottom-start"
        {...popoverState}
        keepChildrenMounted
      >
        <Popover.Trigger asChild>
          <Button size="$2" icon={contextGroupId ? Folder : Globe}>
            {groupTitle}
          </Button>
        </Popover.Trigger>
        <Popover.Content
          borderWidth={1}
          borderColor="$borderColor"
          elevation="$2"
          enterStyle={{y: -10, opacity: 0}}
          exitStyle={{y: -10, opacity: 0}}
          elevate
          animation={[
            'quick',
            {
              opacity: {
                overshootClamping: true,
              },
            },
          ]}
        >
          <Popover.Arrow borderWidth={1} borderColor="$borderColor" />
          <YStack space="$3">
            {draftRoute && !groupPubContext ? (
              <>
                <SizableText size="$2">
                  Will Publish on the Public Web
                </SizableText>
              </>
            ) : null}
            {publishedGroups?.items.length ? (
              <YStack>
                <SizableText size="$1" fontWeight="bold">
                  Published to:
                </SizableText>
                {publishedGroups.items.map((g) => (
                  <Button
                    key={g.groupId}
                    size="$2"
                    onPress={() => nav({key: 'group', groupId: g.groupId})}
                  >
                    {g.groupId}
                  </Button>
                ))}
              </YStack>
            ) : null}
            {groupPubContext ? (
              <>
                <Button
                  icon={Folder}
                  iconAfter={Check}
                  disabled
                  flexDirection="column"
                  alignItems="flex-start"
                >
                  <SizableText size="$3" lineHeight="$1" fontWeight="500">
                    {groupTitle}
                  </SizableText>
                  <SizableText size="$1" color="$color9" lineHeight={0}>
                    /{groupPubContext.pathName || documentId}
                  </SizableText>
                </Button>
              </>
            ) : null}

            {documentId && (pubRoute || !groupPubContext) ? (
              <PublishDialogInstance
                docId={documentId}
                version={versionId}
                groupPubContext={groupPubContext}
                editDraftId={route.key === 'draft' ? route.draftId : undefined}
                {...dialogState}
                closePopover={() => popoverState.onOpenChange(false)}
              />
            ) : null}
            {draftRoute && groupPubContext ? (
              <RemovePublicationGroupButton />
            ) : null}
          </YStack>
        </Popover.Content>
      </Popover>
    </>
  )
}
function RemovePublicationGroupButton() {
  const nav = useNavigate('replace')
  const route = useNavRoute()
  return (
    <Button
      icon={X}
      onPress={() => {
        if (route.key === 'draft') {
          const {pubContext} = route
          if (pubContext?.key === 'group') {
            nav({...route, pubContext: null})
          }
        }
      }}
    >
      Clear Publication Group
    </Button>
  )
}
function PublishDialogInstance({
  closePopover,
  docId,
  version,
  editDraftId,
  groupPubContext,
  ...props
}: DialogProps & {
  closePopover: () => void
  docId: string
  version: string | undefined
  editDraftId: string | undefined
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
          closePopover()
        }
      }}
    >
      <Dialog.Trigger asChild>
        <Button size="$2">Publish to Group</Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay
          key="overlay"
          animation="quick"
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
            'quick',
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
              input={{docId, version, editDraftId}}
              dialogState={props}
            />
          </NavContextProvider>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  )
}

export function DraftPublicationButtons() {
  const route = useNavRoute()
  if (route.key !== 'draft')
    throw new Error('DraftPublicationButtons requires draft route')
  const draftId = route.draftId
  const groupRouteContext =
    route.pubContext?.key === 'group' ? route.pubContext : null
  let navReplace = useNavigate('replace')
  const isDaemonReady = useDaemonReady()
  const publish = usePublishDraft({
    onSuccess: (publishedDoc) => {
      if (!publishedDoc || !draftId) return
      navReplace({
        key: 'publication',
        documentId: draftId,
        versionId: publishedDoc.version,
      })
      toast.success('Document saved and set to public')
    },
    onError: (e: any) => {
      toast.error('Failed to publish: ' + e.message)
    },
  })
  return (
    <>
      <Button
        size="$2"
        disabled={!isDaemonReady}
        onPress={() => {
          console.log('did start publish', draftId, isDaemonReady)
          publish.mutate({draftId})
        }}
        theme="green"
        icon={Check}
      >
        {groupRouteContext ? 'Commit to Group' : 'Commit'}
      </Button>
      <DiscardDraftButton />
    </>
  )
}
