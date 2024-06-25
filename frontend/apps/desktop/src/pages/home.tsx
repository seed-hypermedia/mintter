import {useGRPCClient} from '@/app-context'
import {MainWrapper} from '@/components/main-wrapper'
import {Add, Button, Form, Input} from '@shm/ui'
import {useMutation} from '@tanstack/react-query'
import {dispatchWizardEvent} from 'src/app-account'
import {useAccountKeys} from 'src/models/daemon'
import {Label, XStack, YStack} from 'tamagui'

export default function HomePage() {
  const client = useGRPCClient()
  const {data: keys, refetch: refetchKeys} = useAccountKeys()
  const deleteKey = useMutation({
    mutationFn: async (name: string) => {
      await client.daemon.deleteKey({
        name,
      })
    },
  })
  return (
    <MainWrapper>
      <YStack gap="$4" maxWidth={600} alignSelf="center" width="100%">
        <h1>home page</h1>
        {keys?.length ? (
          <ul>
            {keys.map((key, index) => (
              <li key={key.accountId}>
                <XStack>
                  <YStack>
                    <p style={{display: 'block'}}>
                      public key: {key.publicKey}
                    </p>
                    <p style={{display: 'block'}}>name: {key.name}</p>
                  </YStack>
                  <Button
                    onPress={() => {
                      deleteKey.mutate(key.name)
                      refetchKeys()
                    }}
                  >
                    delete
                  </Button>
                </XStack>
              </li>
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
