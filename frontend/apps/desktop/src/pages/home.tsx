import {useGRPCClient, useQueryInvalidator} from '@/app-context'
import {Avatar} from '@/components/avatar'
import {MainWrapper} from '@/components/main-wrapper'
import {useProfileWithDraft} from '@/models/accounts'
import {queryKeys} from '@/models/query-keys'
import {trpc} from '@/trpc'
import {getAvatarUrl} from '@/utils/account-url'
import {useOpenDraft} from '@/utils/open-draft'
import {useNavigate} from '@/utils/useNavigate'
import {Add, Button, Form, Input, toast} from '@shm/ui'
import {useMutation} from '@tanstack/react-query'
import {dispatchWizardEvent, NamedKey} from 'src/app-account'
import {useAccountKeys} from 'src/models/daemon'
import {Label, SizableText, XStack, YStack} from 'tamagui'

export default function HomePage() {
  const {data: keys} = useAccountKeys()

  return (
    <MainWrapper>
      <YStack gap="$4" maxWidth={600} alignSelf="center" width="100%">
        <h1>home page</h1>
        {keys?.length ? (
          <YStack>
            {keys.map((key, index) => (
              <AccountKeyItem accountKey={key} key={key.accountId} />
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
  )
}

function AccountKeyItem({accountKey}: {accountKey: NamedKey}) {
  const client = useGRPCClient()
  const invalidate = useQueryInvalidator()
  const openDraft = useOpenDraft('push')
  const {draft, profile} = useProfileWithDraft(accountKey.accountId)

  const navigate = useNavigate('push')

  const deleteKey = useMutation({
    mutationFn: async (name: string) => {
      await client.daemon.deleteKey({
        name,
      })
      invalidate([queryKeys.KEYS_LIST])
    },
  })

  function openProfile() {
    navigate({
      key: 'account',
      accountId: accountKey.accountId,
    })
  }

  return (
    <XStack key={accountKey.accountId}>
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
            public key:{' '}
            {accountKey.publicKey.substring(accountKey.publicKey.length - 12)}
          </p>
          <p style={{display: 'block'}}>name: {accountKey.name}</p>
        </YStack>
        <Button
          onPress={() => {
            deleteKey.mutate(accountKey.name)
          }}
        >
          delete key
        </Button>
      </XStack>

      {draft ? (
        <Button onPress={() => openDraft({id: accountKey.accountId})}>
          Resume editing
        </Button>
      ) : (
        <Button onPress={() => openDraft({id: accountKey.accountId})}>
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
