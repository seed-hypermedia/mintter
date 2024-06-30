import {useGRPCClient} from '@/app-context'
import {invalidateQueries} from '@/app-invalidation'
import {MainWrapper} from '@/components/main-wrapper'
import {queryKeys} from '@/models/query-keys'
import {trpc} from '@/trpc'
import {useOpenDraft} from '@/utils/open-draft'
import {Add, Button, Form, Input} from '@shm/ui'
import {useMutation} from '@tanstack/react-query'
import {dispatchWizardEvent, NamedKey} from 'src/app-account'
import {useAccountKeys} from 'src/models/daemon'
import {Label, XStack, YStack} from 'tamagui'

export default function HomePage() {
  const {data: keys} = useAccountKeys()

  return (
    <MainWrapper>
      <YStack gap="$4" maxWidth={600} alignSelf="center" width="100%">
        <h1>home page</h1>
        {keys?.length ? (
          <ul>
            {keys.map((key, index) => (
              <AccountKeyItem accountKey={key} key={key.accountId} />
            ))}
          </ul>
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
      </YStack>
    </MainWrapper>
  )
}

function AccountKeyItem({accountKey}: {accountKey: NamedKey}) {
  const client = useGRPCClient()
  const openDraft = useOpenDraft('push')
  const {data: profile} = trpc.drafts.get.useQuery(accountKey.accountId)
  const deleteKey = useMutation({
    mutationFn: async (name: string) => {
      await client.daemon.deleteKey({
        name,
      })
    },
  })

  return (
    <li key={accountKey.accountId}>
      <XStack>
        <YStack>
          <p style={{display: 'block'}}>public key: {accountKey.publicKey}</p>
          <p style={{display: 'block'}}>name: {accountKey.name}</p>
        </YStack>
        <Button
          onPress={() => {
            deleteKey.mutate(accountKey.name)
            invalidateQueries(queryKeys.KEYS_LIST)
          }}
        >
          delete
        </Button>
      </XStack>

      <Button onPress={() => openDraft({id: accountKey.accountId})}>
        {profile ? 'Edit Profile document' : 'Create Profile Document'}
      </Button>
    </li>
  )
}
