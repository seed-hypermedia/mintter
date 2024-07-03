import {useGRPCClient} from '@/app-context'
import {invalidateQueries} from '@/app-invalidation'
import {MainWrapper} from '@/components/main-wrapper'
import {useProfile} from '@/models/accounts'
import {queryKeys} from '@/models/query-keys'
import {trpc} from '@/trpc'
import {useOpenDraft} from '@/utils/open-draft'
import {useNavigate} from '@/utils/useNavigate'
import {Add, Button, Form, Input} from '@shm/ui'
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
  const openDraft = useOpenDraft('push')
  const data = useProfile(accountKey.accountId)

  console.log(`== ~ AccountKeyItem ~ data:`, data)
  const navigate = useNavigate('push')

  const deleteKey = useMutation({
    mutationFn: async (name: string) => {
      await client.daemon.deleteKey({
        name,
      })
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
            invalidateQueries(queryKeys.KEYS_LIST)
          }}
        >
          delete key
        </Button>
      </XStack>
      {data.draft ? (
        <Button onPress={() => openDraft({id: accountKey.accountId})}>
          Resume editing
        </Button>
      ) : null}

      {data.profile ? (
        <Button onPress={openProfile}>See Profile</Button>
      ) : (
        <Button onPress={() => openDraft({id: accountKey.accountId})}>
          {data.draft ? 'Resume editing' : 'Create Draft'}
        </Button>
      )}
    </XStack>
  )
}

function DraftList() {
  const openDraft = useOpenDraft('push')
  const drafts = trpc.drafts.list.useQuery()
  const deleteDraft = trpc.drafts.delete.useMutation()

  function handleDelete(id: string) {
    deleteDraft.mutateAsync(id).then(() => {
      // drafts.refetch()
      console.log('=== deleted!', id)
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
