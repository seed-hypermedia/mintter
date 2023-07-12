import appError from '@app/errors'
import {useAccount} from '@app/models/accounts'
import {useNavigate} from '@app/utils/navigation'
import {Avatar} from '@components/avatar'
import {
  Button,
  Tooltip,
  Theme,
  SizableText,
  Container,
  YStack,
} from '@mintter/ui'
import {AlertCircle} from '@tamagui/lucide-icons'

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
  return (
    <Tooltip>
      <Tooltip.Trigger>
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
      </Tooltip.Trigger>

      <Tooltip.Content
        enterStyle={{x: 0, y: -5, opacity: 0, scale: 0.9}}
        exitStyle={{x: 0, y: -5, opacity: 0, scale: 0.9}}
        scale={1}
        x={0}
        y={0}
        opacity={1}
        animation={[
          'quick',
          {
            opacity: {
              overshootClamping: true,
            },
          },
        ]}
      >
        <Tooltip.Arrow />
        <Theme inverse>
          <SizableText color="$color" size="$1">
            {account?.data?.profile?.alias}
          </SizableText>
        </Theme>
      </Tooltip.Content>
    </Tooltip>
  )
}
