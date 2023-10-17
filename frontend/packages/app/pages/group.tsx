import Footer from '@mintter/app/components/footer'
import {
  Document,
  Group,
  Role,
  StaticPublication,
  StaticPublicationProvider,
  formattedDate,
  idToUrl,
  pluralS,
  unpackDocId,
  unpackHmId,
} from '@mintter/shared'
import {
  Button,
  ButtonText,
  Container,
  DialogDescription,
  DialogTitle,
  Form,
  Heading,
  Input,
  Label,
  MainWrapper,
  Text,
  Tooltip,
  View,
  XGroup,
  XStack,
  YStack,
} from '@mintter/ui'
import {
  ArrowUpRight,
  Pencil,
  PlusCircle,
  Store,
  Trash,
} from '@tamagui/lucide-icons'
import {Allotment} from 'allotment'
import 'allotment/dist/style.css'
import {useEffect, useMemo, useRef, useState} from 'react'
import {toast} from 'react-hot-toast'
import {AccountLinkAvatar} from '../components/account-link-avatar'
import {EntityVersionsAccessory} from '../components/changes-list'
import {useAppDialog} from '../components/dialog'
import {useEditGroupInfoDialog} from '../components/edit-group-info'
import {FooterButton} from '../components/footer'
import {AppLinkText} from '../components/link'
import {OptionsDropdown, copyLinkMenuItem} from '../components/list-item'
import {PublicationListItem} from '../components/publication-list-item'
import {
  StaticBlockAccount,
  StaticBlockGroup,
  StaticBlockPublication,
} from '../components/static-embeds'
import {EditDocActions} from '../components/titlebar/common'
import {VersionChangesInfo} from '../components/version-changes-info'
import {useAccount, useMyAccount} from '../models/accounts'
import {useAllChanges} from '../models/changes'
import {useDraftList, usePublication} from '../models/documents'
import {
  useAddGroupMember,
  useGroup,
  useGroupContent,
  useGroupMembers,
  useRemoveDocFromGroup,
  useRenameGroupDoc,
} from '../models/groups'
import {useOpenUrl} from '../open-url'
import {GroupRoute, useNavRoute} from '../utils/navigation'
import {useOpenDraft} from '../utils/open-draft'
import {pathNameify} from '../utils/path'
import {hostnameStripProtocol} from '../utils/site-hostname'
import {useNavigate} from '../utils/useNavigate'

export function RenamePubDialog({
  input: {groupId, pathName, docTitle},
  onClose,
}: {
  input: {groupId: string; pathName: string; docTitle: string}
  onClose: () => void
}) {
  const [renamed, setRenamed] = useState(pathName)
  const renameDoc = useRenameGroupDoc()
  return (
    <Form
      onSubmit={() => {
        onClose()
        toast.promise(
          renameDoc.mutateAsync({
            pathName,
            groupId,
            newPathName: pathNameify(renamed),
          }),
          {
            success: 'Renamed',
            loading: 'Renaming..',
            error: 'Failed to rename',
          },
        )
      }}
    >
      <DialogTitle>Change short path</DialogTitle>
      <DialogDescription>
        Choose a new short name for &quot;{docTitle}&quot; in this group. Be
        careful, as this will change web URLs.
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

function GroupContentItem({
  docId,
  version,
  latestVersion,
  hasDraft,
  groupId,
  pathName,
  userRole,
}: {
  docId: string
  version?: string
  latestVersion?: string
  hasDraft: undefined | Document
  groupId: string
  pathName: string
  userRole: Role
}) {
  const removeDoc = useRemoveDocFromGroup()
  const pub = usePublication({id: docId, version})
  const renameDialog = useAppDialog(RenamePubDialog)
  if (!pub.data) return null
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
          docTitle: pub.data.document?.title || '',
        })
      },
      key: 'rename',
    },
  ]
  return (
    <>
      <PublicationListItem
        publication={pub.data}
        hasDraft={hasDraft}
        pathName={pathName}
        onPathNamePress={() => {
          renameDialog.open({
            pathName,
            groupId,
            docTitle: pub.data.document?.title || '',
          })
        }}
        pubContext={{key: 'group', groupId, pathName}}
        menuItems={[
          copyLinkMenuItem(
            idToUrl(docId, undefined, version), // this will produce a /d/eid URL but we really want a /g/eid/pathName URL here :(
            'Group Publication',
          ),
          ...(userRole !== Role.ROLE_UNSPECIFIED ? memberMenuItems : []),
        ]}
        openRoute={{
          key: 'publication',
          documentId: docId,
          ...(latestVersion === version
            ? {pubContext: {key: 'group', groupId, pathName}}
            : {versionId: version}),
        }}
      />
      {renameDialog.content}
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

function InviteMemberDialog({
  input,
  onClose,
}: {
  input: {groupId: string}
  onClose: () => void
}) {
  const [memberId, setMemberId] = useState('')
  const addMember = useAddGroupMember()
  return (
    <>
      <Form
        onSubmit={() => {
          const normalized = normalizeAccountId(memberId)
          if (!normalized) {
            toast.error('Invalid account ID')
            return
          }
          addMember
            .mutateAsync({
              groupId: input.groupId,
              newMemberAccount: normalized,
            })
            .then(() => {
              onClose()
            })
        }}
      >
        <DialogTitle>Add Group Editor</DialogTitle>
        <Label>Account Id</Label>
        <Input value={memberId} onChangeText={setMemberId} />
        <DialogDescription>
          Search for member alias, or paste member ID
        </DialogDescription>
        <Form.Trigger asChild>
          <Button>Add Member</Button>
        </Form.Trigger>
      </Form>
    </>
  )
}
function PublicationDisplay({urlWithVersion}: {urlWithVersion: string}) {
  const openUrl = useOpenUrl()
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
      <StaticPublicationProvider
        entityComponents={{
          StaticAccount: StaticBlockAccount,
          StaticGroup: StaticBlockGroup,
          StaticPublication: StaticBlockPublication,
        }}
        onLinkClick={(href, e) => {
          e.preventDefault()
          e.stopPropagation()
          openUrl(href)
        }}
      >
        <StaticPublication publication={pub.data} />
      </StaticPublicationProvider>
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

export default function GroupPage() {
  const route = useNavRoute()
  if (route.key !== 'group') throw new Error('Group page needs group route')
  const {groupId, version} = route
  const group = useGroup(groupId, version, {
    refetchInterval: 5_000,
  })
  const groupContent = useGroupContent(groupId, version)
  const latestGroupContent = useGroupContent(groupId)
  // const groupMembers = useGroupMembers(groupId, version)
  const groupMembers = useGroupMembers(groupId)
  const drafts = useDraftList()
  const myAccount = useMyAccount()
  const myMemberRole =
    groupMembers.data?.members[myAccount.data?.id || ''] ||
    Role.ROLE_UNSPECIFIED
  const isMember = myMemberRole !== Role.ROLE_UNSPECIFIED
  // const isOwner = myAccount.data?.id === group.data?.ownerAccountId
  // const owner = groupMembers.data?.members[group.data?.ownerAccountId || '']
  const spawn = useNavigate('spawn')
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
  const hasOkSync = lastOkSyncTime && lastOkSyncTime.seconds !== 0n
  const siteVersionMatches = true
  //https://www.notion.so/mintter/SiteInfo-version-not-set-c37f78820189401ab4621ae0f7c1b63a?pvs=4
  // const siteVersionMatches =
  //   group.data?.version === group.data?.siteInfo?.version
  const siteSyncStatus =
    isRecentlySynced && hasOkSync
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
              .catch((e) => {
                console.error(e)
                toast.error('Failed to remove front document: ' + e.message)
              })
          },
        }
      : null,
  ].filter(Boolean)
  const openUrl = useOpenUrl()
  const entityId = unpackHmId(groupId)
  return (
    <>
      <YStack flex={1} justifyContent="space-between" maxHeight={'100%'}>
        <Allotment defaultSizes={[100]}>
          <Allotment.Pane>
            <MainWrapper maxHeight={'100%'}>
              <Container>
                <YStack
                  gap="$2"
                  borderBottomWidth={1}
                  borderColor="$gray6"
                  paddingVertical="$4"
                  paddingHorizontal={0}
                >
                  <XStack justifyContent="space-between">
                    <Heading
                      size="$4"
                      display="flex"
                      gap="$1"
                      alignItems="center"
                    >
                      {group.data?.title} -
                      {ownerAccountId ? (
                        <>
                          Managed by{' '}
                          <AccountLinkAvatar accountId={ownerAccountId} />
                          <AppLinkText
                            toRoute={{
                              key: 'account',
                              accountId: ownerAccountId,
                            }}
                          >
                            {ownerAccount.data?.profile?.alias}
                          </AppLinkText>
                        </>
                      ) : null}
                    </Heading>
                    <XStack gap="$3" alignItems="center">
                      {siteBaseUrl && (
                        <Tooltip content={`Open on the web.`}>
                          <ButtonText
                            fontFamily={'$mono'}
                            fontSize={'$4'}
                            hoverStyle={{textDecorationLine: 'underline'}}
                            onPress={() => {
                              openUrl(siteBaseUrl)
                            }}
                            color="$blue10"
                          >
                            {hostnameStripProtocol(siteBaseUrl)}
                          </ButtonText>
                        </Tooltip>
                      )}
                      {syncStatus && group.data && (
                        <Tooltip content={syncStatus.message(group.data)}>
                          <View
                            style={{
                              borderRadius: 5,
                              width: 10,
                              height: 10,
                              backgroundColor: syncStatus.color,
                            }}
                          />
                        </Tooltip>
                      )}
                      {!frontDocumentUrl && isMember && (
                        <Button
                          icon={Store}
                          size="$2"
                          onPress={() => {
                            openDraft(
                              {groupId, pathName: '/', key: 'group'},
                              {pathName: '/'},
                            )
                          }}
                        >
                          Create Front Document
                        </Button>
                      )}

                      <XGroup>
                        <XGroup.Item>
                          {isMember && (
                            <Button
                              icon={Pencil}
                              size="$2"
                              onPress={() => {
                                editGroupInfo.open(groupId)
                              }}
                            ></Button>
                          )}
                        </XGroup.Item>
                      </XGroup>
                    </XStack>
                  </XStack>

                  <Text fontFamily="$body" fontSize="$3">
                    {group.data?.description}
                  </Text>
                </YStack>

                {memberCount > 1 || myMemberRole === Role.OWNER ? (
                  <XStack
                    gap="$2"
                    borderBottomWidth={1}
                    borderColor="$gray6"
                    paddingVertical="$4"
                    paddingHorizontal={0}
                    justifyContent="space-between"
                  >
                    <XStack gap="$2">
                      <Heading size="$4">Membership</Heading>
                      {Object.keys(groupMembers.data?.members || {}).map(
                        (memberId) => (
                          <AccountLinkAvatar
                            accountId={memberId}
                            key={memberId}
                          />
                        ),
                      )}
                    </XStack>
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

                {frontPageId && frontDocumentUrl && (
                  <XStack
                    gap="$2"
                    borderBottomWidth={1}
                    borderColor="$gray6"
                    paddingVertical="$4"
                    paddingHorizontal={0}
                    minHeight="$6"
                  >
                    <PublicationDisplay urlWithVersion={frontDocumentUrl} />

                    <XStack
                      gap="$2"
                      position="absolute"
                      right={0}
                      top={'$4'}
                      alignItems="center"
                    >
                      {frontDocMenuItems.length ? (
                        <OptionsDropdown menuItems={frontDocMenuItems} />
                      ) : null}
                      <EditDocActions
                        contextRoute={route}
                        pubContext={{
                          key: 'group',
                          groupId,
                          pathName: '/',
                        }}
                        docId={frontPageId?.docId}
                        baseVersion={frontPageId?.version || undefined}
                        navMode="push"
                      />
                      <Tooltip content="Open in New Window">
                        <Button
                          icon={ArrowUpRight}
                          size="$2"
                          onPress={() => {
                            spawn({
                              key: 'publication',
                              documentId: frontPageId?.docId,
                              pubContext: {
                                key: 'group',
                                groupId,
                                pathName: '/',
                              },
                            })
                          }}
                        />
                      </Tooltip>
                    </XStack>
                  </XStack>
                )}
                <YStack paddingVertical="$4" gap="$4">
                  <Heading size="$5">Group Content</Heading>
                  {Object.entries(groupContent.data?.content || {}).map(
                    ([pathName, hmUrl]) => {
                      const docId = unpackDocId(hmUrl)
                      if (!docId) return null
                      if (pathName === '/') return null

                      const latestEntry =
                        latestGroupContent.data?.content?.[pathName]
                      const latestDocId = latestEntry
                        ? unpackDocId(latestEntry)
                        : null

                      return (
                        <GroupContentItem
                          key={pathName}
                          docId={docId?.docId}
                          groupId={groupId}
                          version={docId?.version || undefined}
                          latestVersion={latestDocId?.version || undefined}
                          hasDraft={drafts.data?.documents.find(
                            (d) => d.id == docId.docId,
                          )}
                          userRole={myMemberRole}
                          pathName={pathName}
                        />
                      )
                    },
                  )}
                </YStack>
              </Container>
            </MainWrapper>
          </Allotment.Pane>
          {group.data?.version && route.accessory?.key === 'versions' ? (
            <EntityVersionsAccessory
              id={entityId}
              activeVersion={group.data?.version}
            />
          ) : null}
        </Allotment>
        <Footer>
          <XStack gap="$3" marginHorizontal="$3">
            {group.data?.version && (
              <VersionChangesInfo version={group.data?.version} />
            )}
          </XStack>
          <ChangesFooterItem route={route} />
        </Footer>
        {inviteMember.content}
        {editGroupInfo.content}
      </YStack>
    </>
  )
}

function ChangesFooterItem({route}: {route: GroupRoute}) {
  const changes = useAllChanges(route.groupId)
  const count = useMemo(
    () => Object.keys(changes?.data?.changes || {}).length || 0,
    [changes.data],
  )
  const replace = useNavigate('replace')
  // if (route.accessory?.key !== 'versions') return null
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
