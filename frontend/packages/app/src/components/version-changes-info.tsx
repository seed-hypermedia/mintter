import {Timestamp} from '@bufbuild/protobuf'
import {NavRoute, useNavRoute} from '../utils/navigation'
import {useNavigate} from '../utils/useNavigate'
import {ButtonText, Tooltip, XStack} from '@mintter/ui'
import {formattedDateLong, formattedDateMedium} from '@mintter/shared'
import {useChange} from '../models/changes'
import {useAccount} from '../models/accounts'
import {AccountLinkAvatar} from './account-link-avatar'

export function VersionChangesInfo({version}: {version: string}) {
  const changeIds = version.split('.')
  return changeIds.map((changeId) => (
    <ChangeInfo key={changeId} changeId={changeId} />
  ))
}

function PublishTimeItem({
  publishTime,
  destRoute,
}: {
  publishTime: Timestamp
  destRoute?: NavRoute
}) {
  const navigate = useNavigate()
  const enabled = !!destRoute
  return (
    <Tooltip content={`Version Published on ${formattedDateLong(publishTime)}`}>
      <ButtonText
        fontSize="$1"
        color="$color9"
        hoverStyle={
          enabled
            ? {
                textDecorationLine: 'underline',
              }
            : undefined
        }
        disabled={!enabled}
        onPress={() => {
          if (destRoute) {
            navigate(destRoute)
          }
        }}
      >
        {formattedDateMedium(publishTime)}
      </ButtonText>
    </Tooltip>
  )
}

function AuthorLink({author}: {author: string}) {
  const navigate = useNavigate()
  const account = useAccount(author)
  return (
    <ButtonText
      fontSize="$1"
      color="$color9"
      hoverStyle={{
        textDecorationLine: 'underline',
      }}
      onPress={() => {
        navigate({key: 'account', accountId: author})
      }}
      gap="$1"
      display="flex"
    >
      <AccountLinkAvatar size={16} accountId={author} />
      {account.data?.profile?.alias || account.data?.id.slice(-10) || ''}
    </ButtonText>
  )
}

function ChangeInfo({changeId}: {changeId: string}) {
  const change = useChange(changeId)
  const route = useNavRoute()
  let destRoute: NavRoute | null = null
  if (route.key === 'group') {
    destRoute = {...route, version: changeId}
  } else if (route.key === 'publication') {
    destRoute = {...route, versionId: changeId}
  }

  return (
    <XStack gap="$2">
      {change?.data?.author && <AuthorLink author={change?.data?.author} />}
      {destRoute && change.data?.createTime && change.data?.createTime ? (
        <PublishTimeItem
          publishTime={change.data?.createTime}
          destRoute={destRoute}
        />
      ) : null}
    </XStack>
  )
}
