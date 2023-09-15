import Footer from '@mintter/app/src/components/footer'
import {Document, Role, unpackDocId, unpackHmId} from '@mintter/shared'
import {
  Button,
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
import {useState} from 'react'
import {toast} from 'react-hot-toast'
import {AccountLinkAvatar} from '../components/account-link-avatar'
import {useAppDialog} from '../components/dialog'
import {PublicationListItem} from '../components/publication-list-item'
import {useAccount, useMyAccount} from '../models/accounts'
import {useDraftList, usePublication} from '../models/documents'
import {
  useAddGroupMember,
  useGroup,
  useGroupContent,
  useGroupMembers,
  useRemoveDocFromGroup,
  useRenameGroupDoc,
} from '../models/groups'
import {useNavRoute, useNavigate} from '../utils/navigation'
import {AppLinkText} from '../components/link'
import {pathNameify} from '../utils/path'
import {useOpenDraft} from '../utils/open-draft'
import {StaticBlockNode} from '@mintter/editor'
import {EditDocActions} from '../components/titlebar/common'
import {useEditGroupInfoDialog} from '../components/edit-group-info'

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
  hasDraft,
  groupId,
  pathName,
}: {
  docId: string
  version?: string
  hasDraft: undefined | Document
  groupId: string
  pathName: string
}) {
  const removeDoc = useRemoveDocFromGroup()
  const pub = usePublication({documentId: docId, versionId: version})
  const renameDialog = useAppDialog(RenamePubDialog)
  if (!pub.data) return null
  return (
    <>
      <PublicationListItem
        publication={pub.data}
        hasDraft={hasDraft}
        label={pathName}
        onLabelPress={() => {
          renameDialog.open({
            pathName,
            groupId,
            docTitle: pub.data.document?.title || '',
          })
        }}
        pubContext={{key: 'group', groupId, pathName}}
        menuItems={[
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
        ]}
        openRoute={{
          key: 'publication',
          documentId: docId,
          pubContext: {key: 'group', groupId, pathName},
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
  const unpacked = unpackDocId(urlWithVersion)
  const pub = usePublication({
    documentId: unpacked?.docId || '',
    versionId: unpacked?.version || '',
  })

  return pub.data?.document?.children?.map((block) => {
    return <StaticBlockNode block={block} key={block?.block?.id} />
  })
}

export default function GroupPage() {
  const route = useNavRoute()
  if (route.key !== 'group') throw new Error('Group page needs group route')
  const {groupId} = route
  const group = useGroup(groupId)
  const groupContent = useGroupContent(groupId)

  console.log(`== ~ GroupPage ~ groupContent:`, groupContent.data)
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
  const editGroupInfo = useEditGroupInfoDialog()
  return (
    <>
      <MainWrapper>
        <Container>
          <YStack
            gap="$2"
            borderBottomWidth={1}
            borderColor="$gray6"
            paddingVertical="$4"
            paddingHorizontal={0}
          >
            <XStack justifyContent="space-between">
              <Heading size="$4" display="flex" gap="$1" alignItems="center">
                {group.data?.title} -
                {ownerAccountId ? (
                  <>
                    Managed by <AccountLinkAvatar accountId={ownerAccountId} />
                    <AppLinkText
                      toRoute={{key: 'account', accountId: ownerAccountId}}
                    >
                      {ownerAccount.data?.profile?.alias}
                    </AppLinkText>
                  </>
                ) : null}
              </Heading>
              <XStack gap="$2">
                {!frontDocumentUrl && (
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
                    <Button
                      icon={Pencil}
                      size="$2"
                      onPress={() => {
                        editGroupInfo.open(groupId)
                      }}
                    ></Button>
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
                <Heading size="$2">Membership</Heading>
                {Object.keys(groupMembers.data?.members || {}).map(
                  (memberId) => (
                    <AccountLinkAvatar accountId={memberId} key={memberId} />
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
              <YStack>
                <PublicationDisplay urlWithVersion={frontDocumentUrl} />
              </YStack>
              <XStack gap="$2" position="absolute" right={0} top={'$4'}>
                <EditDocActions
                  contextRoute={route}
                  pubContext={{
                    key: 'group',
                    groupId,
                    pathName: '/',
                  }}
                  docId={frontPageId?.docId}
                  baseVersion={frontPageId?.version}
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
                        pubContext: {key: 'group', groupId, pathName: '/'},
                      })
                    }}
                  />
                </Tooltip>
              </XStack>
            </XStack>
          )}

          <YStack paddingVertical="$2" gap="$2">
            <Heading size="$2">Group Content</Heading>
            {Object.entries(groupContent.data?.content || {}).map(
              ([pathName, hmUrl]) => {
                const docId = unpackDocId(hmUrl)

                if (!docId) return null
                if (pathName === '/') return null
                return (
                  <GroupContentItem
                    key={pathName}
                    docId={docId?.docId}
                    groupId={groupId}
                    version={docId?.version}
                    hasDraft={drafts.data?.documents.find(
                      (d) => d.id == docId.docId,
                    )}
                    pathName={pathName}
                  />
                )
              },
            )}
          </YStack>
        </Container>
      </MainWrapper>
      <Footer />
      {inviteMember.content}
      {editGroupInfo.content}
    </>
  )
}
