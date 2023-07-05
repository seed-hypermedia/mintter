import {abbreviateCid} from '@mintter/shared'
import {cidURL} from '../ipfs'
import Link from 'next/link'
import {Avatar, XStack, Text} from '@mintter/ui'
import {trpc} from '../trpc'

export function AccountRow({
  account,
  bold,
}: {
  account?: string
  bold?: boolean
}) {
  // return <Text>{account}</Text>
  const acct = trpc.account.get.useQuery({
    accountId: account,
  })
  let profile = acct.data?.account?.profile
  let label = '?'
  if (profile && profile.alias) {
    label = profile.alias
  } else if (account) {
    label = abbreviateCid(account)
  }
  return (
    <Link href={`/a/${account}`} style={{textDecoration: 'none'}}>
      <XStack gap="$3" alignItems="center">
        <Avatar circular size={24}>
          {profile?.avatar ? (
            <Avatar.Image src={cidURL(profile.avatar)} />
          ) : null}
          <Avatar.Fallback backgroundColor={'#26ab95'} />
        </Avatar>
        <Text
          hoverStyle={{textDecorationLine: 'underline'}}
          fontWeight={bold ? 'bold' : undefined}
        >
          {label}
        </Text>
      </XStack>
    </Link>
  )
}
