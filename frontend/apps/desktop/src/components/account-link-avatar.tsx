import {Avatar} from '@app/components/avatar'
import appError from '@app/errors'
import {useAccount} from '@app/models/accounts'
import {useNavigate} from '@app/utils/navigation'
import {Button, YStack} from '@mintter/ui'
import {AlertCircle} from '@tamagui/lucide-icons'
import {Tooltip} from './tooltip'

export function ErrorDot() {
  return (
    <YStack
      backgroundColor={'#ff3333'}
      display="flex"
      position="absolute"
      top={-8}
      left={-8}
      padding={0}
      paddingLeft={-4}
      width={16}
      height={16}
      borderRadius={8}
    >
      <AlertCircle size={16} />
    </YStack>
  )
}

export function AccountLinkAvatar({accountId}: {accountId?: string}) {
  const navigate = useNavigate()
  const account = useAccount(accountId)
  let content = account.data?.profile ? (
    <Avatar
      size="$1"
      alias={account.data.profile.alias}
      accountId={account.data.id}
    />
  ) : (
    <>
      <Avatar size="$1" alias={'?'} accountId={accountId} />
      {account.error ? <ErrorDot /> : null}
    </>
  )
  return account?.data?.profile?.alias ? (
    <Tooltip content={account.data.profile.alias}>
      <Button
        size="$1"
        backgroundColor="transparent"
        hoverStyle={{backgroundColor: 'transparent'}}
        minWidth={20}
        minHeight={20}
        onPress={(e) => {
          e.preventDefault()
          e.stopPropagation()
          if (!accountId) return appError('No account ready to load')
          navigate({key: 'account', accountId})
        }}
        position="relative"
        data-testid="list-item-author"
      >
        {content}
      </Button>
    </Tooltip>
  ) : (
    content
  )
}
