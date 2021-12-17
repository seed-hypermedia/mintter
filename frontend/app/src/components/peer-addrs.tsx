import {Box} from '@mintter/ui/box'
import {Button} from '@mintter/ui/button'
import {Text} from '@mintter/ui/text'
import {TextField} from '@mintter/ui/text-field'
import {useMemo} from 'react'
import CopyToClipboard from 'react-copy-to-clipboard'
import toast from 'react-hot-toast'
import {useAccountInfo} from '../auth-context'
import {usePeerAddrs} from '../hooks'

export function PeerAddrs() {
  const info = useAccountInfo()

  const peerAddrs = usePeerAddrs()

  const copyText = useMemo(() => peerAddrs.data?.join(','), [peerAddrs.data])

  if (peerAddrs.isLoading) {
    return <Text>Loading...</Text>
  }

  if (peerAddrs.isError) {
    console.log('error: ', peerAddrs.error)
    return <Text>ERROR</Text>
  }

  return (
    <Box>
      <TextField
        readOnly
        textarea
        id="addresses"
        name="addresses"
        label="Your Mintter address"
        rows={4}
        value={peerAddrs.data}
        css={{fontSize: '$2'}}
      />
      <CopyToClipboard
        text={copyText as string}
        onCopy={(_, result) => {
          if (result) {
            toast.success('Address copied to your clipboard!')
          } else {
            toast.error('Error while copying to clipboard')
          }
        }}
      >
        <Button
          variant="outlined"
          color="success"
          size="1"
          type="button"
          css={{
            marginTop: '$5',
          }}
        >
          Copy Address
        </Button>
      </CopyToClipboard>
    </Box>
  )
}
