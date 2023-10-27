import Footer from '@mintter/app/components/footer'
import {
  Document,
  Group,
  PublicationContent,
  Role,
  formattedDate,
  idToUrl,
  pluralS,
  unpackDocId,
  unpackHmId,
} from '@mintter/shared'
import {
  Button,
  Container,
  DialogDescription,
  DialogTitle,
  Form,
  H1,
  Heading,
  Input,
  Label,
  MainWrapper,
  Separator,
  SizableText,
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
import {copyLinkMenuItem} from '../components/list-item'
import {OptionsDropdown} from '../components/options-dropdown'
import {PublicationListItem} from '../components/publication-list-item'
import {EditDocActions} from '../components/titlebar-common'
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
import {AppPublicationContentProvider} from './publication'

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
                <XStack gap="$2" padding="$4" paddingHorizontal={0}>
                  <YStack gap="$3" flex={1}>
                    <YStack gap="$3">
                      <H1 fontWeight="bold">{group.data?.title}</H1>
                      {siteBaseUrl && (
                        <XStack alignItems="center" gap="$2">
                          <Tooltip
                            content={`Open group in the web (${syncStatus?.message(
                              group.data,
                            )})`}
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
                        </XStack>
                      )}
                      <XStack>
                        <SizableText size="$5">
                          {group.data?.description}
                        </SizableText>
                      </XStack>
                    </YStack>
                  </YStack>
                  <YStack paddingTop="$4">
                    <XStack gap="$3" alignItems="center">
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

                      <XGroup>
                        <XGroup.Item>
                          {isMember && (
                            <Tooltip content="Edit Group info">
                              <Button
                                icon={Pencil}
                                size="$2"
                                onPress={() => {
                                  editGroupInfo.open(groupId)
                                }}
                              />
                            </Tooltip>
                          )}
                        </XGroup.Item>
                      </XGroup>
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
                            <AccountLinkAvatar
                              size={24}
                              accountId={ownerAccountId}
                            />
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
                      <XStack paddingVertical="$2" gap="$2">
                        {Object.entries(groupMembers.data?.members || {}).map(
                          ([memberId, role]) => {
                            if (role === Role.OWNER) return null
                            return (
                              <AccountLinkAvatar
                                size={24}
                                accountId={memberId}
                                key={memberId}
                              />
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
                <Separator />
                {frontPageId && frontDocumentUrl && (
                  <XStack
                    gap="$2"
                    borderBottomWidth={1}
                    borderColor="$gray6"
                    paddingVertical="$4"
                    paddingHorizontal={0}
                    minHeight="$6"
                    group="item"
                  >
                    <FrontPublicationDisplay
                      urlWithVersion={frontDocumentUrl}
                      groupTitle={group.data?.title || ''}
                    />

                    <XStack
                      gap="$2"
                      position="absolute"
                      right={0}
                      top={'$4'}
                      alignItems="center"
                    >
                      {frontDocMenuItems.length ? (
                        <OptionsDropdown
                          hiddenUntilItemHover
                          menuItems={frontDocMenuItems}
                        />
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

function FrontPublicationDisplay({
  urlWithVersion,
  groupTitle,
}: {
  urlWithVersion: string
  groupTitle: string
}) {
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
      <AppPublicationContentProvider>
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
