import {useConnectionSummary} from '@app/models/contacts'
import {useDaemonOnline, useDaemonReady} from '@app/node-status-context'
import {useNavigate, useNavRoute} from '@app/utils/navigation'
import {
  Button,
  ButtonProps,
  Clock,
  Delete,
  FooterWrapper,
  SizableText,
  User,
  XStack,
} from '@mintter/ui'
import {ReactNode} from 'react'
import {OnlineIndicator} from './indicator'

export function FooterButton({
  active,
  label,
  icon,
  onPress,
}: {
  active?: boolean
  label: string
  icon?: ButtonProps['icon']
  onPress: () => void
}) {
  return (
    <Button
      size="$1"
      chromeless={!active}
      color={active ? '$blue10' : undefined}
      onPress={onPress}
      icon={icon}
      paddingHorizontal="$2"
    >
      {label}
    </Button>
  )
}

function FooterContactsButton() {
  const route = useNavRoute()
  const navigate = useNavigate()
  const summary = useConnectionSummary()
  return (
    <XStack alignItems="center" theme="blue" gap="$2">
      <Button
        size="$1"
        chromeless={route.key != 'connections'}
        color={route.key == 'connections' ? '$blue10' : undefined}
        onPress={() => {
          navigate({key: 'connections'})
        }}
        paddingHorizontal="$2"
      >
        <OnlineIndicator online={summary.online} />
        <User size={12} />
        <SizableText size="$1" color="$color">
          {summary.connectedCount}
        </SizableText>
      </Button>
    </XStack>
  )
}

export default function Footer({children}: {children?: ReactNode}) {
  let isDaemonReady = useDaemonReady()
  let isOnline = useDaemonOnline()

  // let contactsListQuery = useQuery({
  //   enabled: isDaemonReady,
  //   queryKey: [queryKeys.GET_CONTACTS_LIST],
  //   queryFn: () => accountsClient.listAccounts({}),
  // })

  // let contactListService = useInterpret(() => contactsListMachine, {
  //   actions: {
  //     triggerRefetch: () => {
  //       contactsListQuery.refetch()
  //     },
  //     assignErrorMessage: assign({
  //       errorMessage: (_, event) => event.errorMessage,
  //     }),
  //   },
  // })

  // if (contactsListQuery.status == 'error') {
  //   contactListService.send({
  //     type: 'CONTACTS.LIST.ERROR',
  //     errorMessage: JSON.stringify(contactsListQuery.error),
  //   })
  //   return <div className="main-footer">{children}</div>
  // }

  return (
    <FooterWrapper>
      {!isDaemonReady ? (
        <XStack alignItems="center" gap="$2" paddingHorizontal="$3">
          <Clock size={10} />
          <SizableText size="$1" userSelect="none">
            Initializing node...
          </SizableText>
        </XStack>
      ) : !isOnline ? (
        <XStack alignItems="center">
          <Delete size={12} />
          <SizableText size="$1" userSelect="none">
            You are Offline
          </SizableText>
        </XStack>
      ) : null}
      {/* {isDaemonReady ? (
        <Box
          css={{
            display: 'flex',
            alignItems: 'center',
            gap: '0',
          }}
        >
          <ContactsPrompt refetch={() => contactListService.send('REFETCH')} />
          <Contacts service={contactListService} />
        </Box>
      ) : null} */}
      <FooterContactsButton />

      <XStack
        flex={1}
        alignItems="center"
        justifyContent="flex-end"
        marginRight="$2"
      >
        {children}
      </XStack>
    </FooterWrapper>
  )
}
