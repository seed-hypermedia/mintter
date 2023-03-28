import {useAccountIsConnected, useContactsList} from '@app/hooks/contacts'
import {Avatar} from '@components/avatar'
import {Box} from '@components/box'
import {Button} from '@components/button'
import Footer from '@components/footer'
import {OnlineIndicator} from '@components/indicator'
import PageContainer from '@components/page-container'
import {Text} from '@components/text'
import {Account} from '@mintter/shared'
import {useLocation} from 'wouter'

function ContactItem({account}: {account: Account}) {
  const [, setLocation] = useLocation()
  const isConnected = useAccountIsConnected(account)
  const alias = account.profile?.alias
  return (
    <Button
      css={{
        display: 'flex',
        flexGrow: 1,
        background: 'transparent',
        color: '$base-text-normal',
        '&:hover': {background: '$base-background-normal'},
      }}
      onClick={() => {
        setLocation(`/account/${account.id}`)
      }}
    >
      <Avatar
        accountId={account.id}
        size={2}
        alias={account.profile?.alias || ''}
      />
      {alias ? (
        <Text fontWeight="bold" css={{marginInline: '$4'}}>
          {alias}
        </Text>
      ) : (
        <Text fontWeight="bold" color="muted" css={{marginInline: '$4'}}>
          {account.id.slice(0, 5)}...{account.id.slice(-5)}
        </Text>
      )}
      <OnlineIndicator online={isConnected} />
    </Button>
  )
}

export default function ConnectionsPage() {
  const contacts = useContactsList()
  const accounts = contacts.data?.accounts || []
  return (
    <>
      <PageContainer>
        {accounts.map((account) => {
          return <ContactItem key={account.id} account={account} />
        })}
      </PageContainer>
      <Footer />
    </>
  )
}
