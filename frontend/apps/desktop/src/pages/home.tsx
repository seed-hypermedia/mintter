import {useQueryInvalidator} from '@/app-context'
import {Avatar} from '@/components/avatar'
import Footer from '@/components/footer'
import {MainWrapper} from '@/components/main-wrapper'
import {useProfileWithDraft} from '@/models/accounts'
import {useMyAccountIds} from '@/models/daemon'
import {trpc} from '@/trpc'
import {getAvatarUrl} from '@/utils/account-url'
import {useOpenDraft} from '@/utils/open-draft'
import {useNavigate} from '@/utils/useNavigate'
import {createHmId} from '@shm/shared'
import {Add, Button, Form, Input, toast} from '@shm/ui'
import {dispatchWizardEvent} from 'src/app-account'
import {Label, SizableText, XStack, YStack} from 'tamagui'

export default function HomePage() {
  const keys = useMyAccountIds()

  return (
    <>
      <MainWrapper>
        <YStack gap="$4" maxWidth={600} alignSelf="center" width="100%">
          <h1>home page</h1>
          {keys.data?.length ? (
            <YStack>
              {keys.data.map((key) => (
                <AccountKeyItem accountId={key} key={key} />
              ))}
            </YStack>
          ) : (
            <Button onPress={() => dispatchWizardEvent(true)} icon={Add}>
              Add account
            </Button>
          )}
          <Form gap="$2">
            <Label>Open Document</Label>
            <XStack gap="$2">
              <Input placeholder="hm://... or web url" f={1} />
              <Button>Open Document</Button>
            </XStack>
          </Form>
          <Button>Open Seed Hypermedia document</Button>
          <DraftList />
        </YStack>
      </MainWrapper>
      <Footer />
    </>
  )
}

function AccountKeyItem({accountId}: {accountId: string}) {
  const openDraft = useOpenDraft('push')
  const {draft, profile} = useProfileWithDraft(accountId)

  const navigate = useNavigate('push')

  function openProfile() {
    navigate({
      key: 'account',
      accountId,
    })
  }
  const accountDraftId = createHmId('a', accountId)
  return (
    <XStack>
      <XStack f={1} ai="center" gap="$2">
        <Avatar
          size={40}
          url={
            profile?.metadata.avatar
              ? getAvatarUrl(profile.metadata.avatar)
              : ''
          }
        />
        <YStack f={1}>
          <p
            style={{
              display: 'block',
            }}
          >
            public key: {accountId.substring(accountId.length - 12)}
          </p>
        </YStack>
      </XStack>

      {draft ? (
        <Button onPress={() => openDraft({id: accountDraftId})}>
          Resume editing
        </Button>
      ) : (
        <Button onPress={() => openDraft({id: accountDraftId})}>
          {profile ? 'Edit Profile' : 'Create Draft'}
        </Button>
      )}

      {profile ? <Button onPress={openProfile}>See Profile</Button> : null}
    </XStack>
  )
}

function DraftList() {
  const invalidate = useQueryInvalidator()
  const openDraft = useOpenDraft('push')
  const drafts = trpc.drafts.list.useQuery()
  const deleteDraft = trpc.drafts.delete.useMutation()

  function handleDelete(id: string) {
    deleteDraft.mutateAsync(id).then(() => {
      toast.success('Draft Deleted Successfully')
      invalidate(['trpc.drafts.list'])
      invalidate(['trpc.drafts.get', id])
    })
  }

  if (drafts.data && drafts.data?.length != 0) {
    return (
      <YStack>
        {drafts.data.map((draft) => (
          <XStack tag="li" key={draft} gap="$2">
            <XStack f={1}>
              <SizableText style={{display: 'block'}}>{draft}</SizableText>
            </XStack>
            <Button size="$2" onPress={() => openDraft({id: draft})}>
              Open
            </Button>
            <Button size="$2" onPress={() => handleDelete(draft)}>
              Delete
            </Button>
          </XStack>
        ))}
      </YStack>
    )
  }
}
