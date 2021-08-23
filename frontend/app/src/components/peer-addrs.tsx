import {useMemo} from 'react'
import CopyToClipboard from 'react-copy-to-clipboard'
import toast from 'react-hot-toast'

import {Box, Button, Text, TextField} from '@mintter/ui'
import {usePeerAddrs} from '@mintter/client/hooks'

export function PeerAddrs() {
  const peerAddrs = usePeerAddrs()
  const addrs = useMemo(() => peerAddrs.data, [peerAddrs.data])
  const copyText = useMemo(() => addrs?.join(','), [addrs])

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
        // TODO: Fix types
        // @ts-ignore
        as="textarea"
        id="addresses"
        name="addresses"
        label="Your Mintter address"
        rows={4}
        value={addrs?.join('\n\n')}
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
