import {abbreviateCid} from '@mintter/shared'
import {Avatar, SizableText, UIAvatar, XStack} from '@mintter/ui'
import Link from 'next/link'
import {cidURL} from './ipfs'
import {trpc} from './trpc'

export function AccountAvatarLink({account}: {account?: string}) {
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
    <UIAvatar
      id={account}
      url={profile?.avatar ? cidURL(profile.avatar) : undefined}
      color="$color7"
      label={profile?.alias || label}
    />
  )
  return <Link href={`/a/${account}`}>{content}</Link>
}

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
      <UIAvatar
        url={profile?.avatar ? cidURL(profile.avatar) : ''}
        id={account}
        color="$color7"
        size={20}
        label={profile?.alias || label}
      />
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
