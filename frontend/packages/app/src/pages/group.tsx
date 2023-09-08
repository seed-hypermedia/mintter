import Footer from '@mintter/app/src/components/footer'
import {Document, getIdsfromUrl} from '@mintter/shared'
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
  XStack,
  YStack,
} from '@mintter/ui'
import {Pencil, PlusCircle, Trash} from '@tamagui/lucide-icons'
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
import {useNavRoute} from '../utils/navigation'
import {AppLinkText} from '../components/link'

function RenamePubDialog({
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
          renameDoc.mutateAsync({pathName, groupId, newPathName: renamed}),
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
      <Input value={renamed} onChangeText={setRenamed} />
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
          addMember
            .mutateAsync({
              groupId: input.groupId,
              newMemberAccount: memberId,
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
          Search for xmember alias, or paste member ID
        </DialogDescription>
        <Form.Trigger asChild>
          <Button>Add Member</Button>
        </Form.Trigger>
      </Form>
    </>
  )
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
  const isOwner = myAccount.data?.id === group.data?.ownerAccountId
  // const owner = groupMembers.data?.members[group.data?.ownerAccountId || '']
  const ownerAccount = useAccount(group.data?.ownerAccountId)
  const inviteMember = useAppDialog(InviteMemberDialog)
  const ownerAccountId = group.data?.ownerAccountId
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
            <Text fontFamily="$body" fontSize="$3">
              {group.data?.description}
            </Text>
          </YStack>

          <YStack
            gap="$2"
            borderBottomWidth={1}
            borderColor="$gray6"
            paddingVertical="$4"
            paddingHorizontal={0}
          >
            <Heading size="$2">Group Members</Heading>
            <XStack gap="$2">
              {Object.keys(groupMembers.data?.members || {}).map((memberId) => (
                <AccountLinkAvatar accountId={memberId} key={memberId} />
              ))}
              {isOwner && (
                <InviteMemberButton
                  onPress={() => {
                    inviteMember.open({groupId})
                  }}
                />
              )}
            </XStack>
          </YStack>
          <YStack paddingVertical="$2" gap="$2">
            {Object.entries(groupContent.data?.content || {}).map(
              ([pathName, hmUrl]) => {
                const [docId, version] = getIdsfromUrl(hmUrl)

                if (!docId) return null
                return (
                  <GroupContentItem
                    key={docId}
                    docId={docId}
                    groupId={groupId}
                    version={version}
                    hasDraft={drafts.data?.documents.find((d) => d.id == docId)}
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
    </>
  )
}
