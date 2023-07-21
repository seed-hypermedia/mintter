import {abbreviateCid} from '@mintter/shared'
import {cidURL} from '../ipfs'
import Link from 'next/link'
import {Avatar, XStack, Text, SizableText} from '@mintter/ui'
import {trpc} from '../trpc'

export function AccountRow({
  account,
  isMainAuthor,
  clickable = true,
  onlyAvatar = false,
}: {
  account?: string
  isMainAuthor?: boolean
  clickable?: boolean
  onlyAvatar?: boolean
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
  const content = (
    <XStack gap="$2" alignItems="center">
      <Avatar circular size={20}>
        {profile?.avatar ? <Avatar.Image src={cidURL(profile.avatar)} /> : null}
        <Avatar.Fallback backgroundColor="$color7" />
      </Avatar>
      {!onlyAvatar ? (
        <>
          <SizableText
            flex={1}
            size="$3"
            hoverStyle={
              clickable ? {textDecorationLine: 'underline'} : undefined
            }
          >
            {label}
          </SizableText>
          {isMainAuthor ? (
            <SizableText
              paddingVertical="$1.5"
              paddingHorizontal="$2"
              backgroundColor="$color8"
              color="white"
              borderRadius="$2"
              size="$1"
              fontWeight="600"
              lineHeight={12}
            >
              main
            </SizableText>
          ) : null}
        </>
      ) : null}
    </XStack>
  )

  if (clickable) {
    return (
      <Link href={`/a/${account}`} style={{textDecoration: 'none'}}>
        {content}
      </Link>
    )
  }
  return content
}
