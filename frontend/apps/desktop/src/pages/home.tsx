import { useGRPCClient } from '@shm/desktop/src/app-context'
import { MainWrapper } from '@shm/desktop/src/components/main-wrapper'
import { Button } from '@shm/ui'
import { useMutation } from '@tanstack/react-query'
import { useAccountKeys } from 'src/models/daemon'
import { XStack, YStack } from 'tamagui'

export default function HomePage() {
  const client = useGRPCClient()
  const { data: keys, refetch: refetchKeys } = useAccountKeys()
  const deleteKey = useMutation({
    mutationFn: async (name: string) => {
      await client.daemon.deleteKey({
        name,
      })
    },
  })
  return (
    <MainWrapper>
      <h1>home page</h1>
      {keys?.length ? (
        <ul>
          {keys.map((key, index) => (
            <li key={key.accountId}>
              <XStack>
                <YStack>
                  <p style={{ display: 'block' }}>public key: {key.publicKey}</p>
                  <p style={{ display: 'block' }}>name: {key.name}</p>
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
        <p>no keys found</p>
      )}
    </MainWrapper>
  )
}
