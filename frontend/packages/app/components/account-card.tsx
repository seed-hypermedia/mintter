// tamagui-ignore
import * as Ariakit from '@ariakit/react'
import {UIAvatar, XStack, YStack} from '@mintter/ui'
import {SizableText} from 'tamagui'
import {useAccount} from '../models/accounts'
import {AccountTrustButton} from './account-trust'

export function AccountCard({
  accountId,
  children,
  hideActions = false,
}: {
  accountId?: string
  children: React.ReactNode
  hideActions?: boolean
}) {
  let account = useAccount(accountId)
  return accountId && account.status == 'success' ? (
    <Ariakit.HovercardProvider
      animated
      timeout={250}
      hideTimeout={250}
      placement="top-start"
    >
      <Ariakit.HovercardAnchor>{children}</Ariakit.HovercardAnchor>
      <Ariakit.Hovercard
        render={
          <YStack
            minWidth={240}
            minHeight={160}
            zIndex={109999}
            backgroundColor="$background"
            padding="$4"
            elevation="$3"
            animation="fast"
            borderRadius="$3"
            maxWidth={260}
            gap="$3"
          >
            <XStack
              justifyContent="space-between"
              alignItems="flex-start"
              gap="$3"
            >
              <UIAvatar
                id={accountId}
                size={44}
                url={account.data.profile?.avatar}
                label={account.data.profile?.alias || accountId}
              />
              {accountId && !hideActions ? (
                <XStack alignItems="flex-end" gap="$3">
                  <AccountTrustButton
                    iconOnly
                    accountId={accountId}
                    isTrusted={account.data.isTrusted}
                  />
                </XStack>
              ) : null}
            </XStack>
            <YStack>
              <SizableText size="$5" fontWeight="bold">
                {account.data.profile?.alias ||
                  `${accountId.slice(0, 5)}...${accountId.slice(-5)}`}
              </SizableText>
              <SizableText>{account.data.profile?.bio}</SizableText>
            </YStack>
          </YStack>
        }
      ></Ariakit.Hovercard>
    </Ariakit.HovercardProvider>
  ) : (
    children
  )
}
