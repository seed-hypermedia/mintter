import appError from '@app/errors'
import {useAccount} from '@app/hooks/accounts'
import {useNavigate} from '@app/utils/navigation'
import {Button, UIAvatar, Tooltip, Theme, SizableText} from '@mintter/ui'

export function AccountLinkAvatar({accountId}: {accountId?: string}) {
  const navigate = useNavigate()
  const account = useAccount(accountId)
  return (
    <Tooltip>
      <Tooltip.Trigger>
        <Button
          size="$1"
          backgroundColor="transparent"
          hoverStyle={{backgroundColor: 'transparent'}}
          onPress={(e) => {
            e.preventDefault()
            e.stopPropagation()
            if (!accountId) return appError('No account ready to load')
            navigate({key: 'account', accountId})
          }}
          data-testid="list-item-author"
        >
          {account?.data?.profile?.alias ? (
            <UIAvatar size="$1" alias={account.data.profile.alias} />
          ) : (
            account?.data?.profile?.alias
          )}
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
