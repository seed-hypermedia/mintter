import {useGRPCClient} from '@shm/app/app-context'
import {MainWrapper} from '@shm/app/components/main-wrapper'
import {Button} from '@shm/ui'
import {useMutation, useQuery} from '@tanstack/react-query'
import {XStack, YStack} from 'tamagui'

export default function HomePage() {
  const client = useGRPCClient()
  const {data: keys, refetch: refetchKeys} = useQuery({
    queryKey: ['LIST_KEYS'],
    queryFn: async () => {
      const res = await client.daemon.listKeys({})
      return res.keys
    },
  })
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
                  <p style={{display: 'block'}}>public key: {key.publicKey}</p>
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
        <p>no keys found</p>
      )}
    </MainWrapper>
  )
}
