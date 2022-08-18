import {usePeerAddrs} from '@app/hooks'
import {CSS} from '@app/stitches.config'
import {useMemo} from 'react'
import CopyToClipboard from 'react-copy-to-clipboard'
import toast from 'react-hot-toast'
import {Box} from './box'
import {Button} from './button'
import {Text} from './text'
import {TextField} from './text-field'

export function PeerAddrs() {
  const peerAddrs = usePeerAddrs()

  const copyText = useMemo(() => peerAddrs.data?.join(','), [peerAddrs.data])

  if (peerAddrs.isLoading) {
    return <Text>Loading...</Text>
  }

  if (peerAddrs.isError) {
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
        containerCss={{fontSize: '$2'} as CSS}
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
            marginBlockStart: '$5',
          }}
        >
          Copy Address
        </Button>
      </CopyToClipboard>
    </Box>
  )
}
