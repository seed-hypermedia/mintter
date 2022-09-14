import {usePeerAddrs} from '@app/auth-context'
import {CSS} from '@app/stitches.config'
import {useMemo} from 'react'
import CopyToClipboard from 'react-copy-to-clipboard'
import toast from 'react-hot-toast'
import {Box} from './box'
import {Button} from './button'
import {Text} from './text'
import {TextField} from './text-field'

export function PeerAddrs({
  handleCopy,
}: {
  handleCopy?: (str: string, res: boolean) => void
}) {
  const peerAddrs = usePeerAddrs()
  const copyText = useMemo(() => peerAddrs?.join(','), [peerAddrs])

  function localHandleCopy(txt: string, result: boolean) {
    if (result) {
      toast.success('Address copied to your clipboard!')
    } else {
      toast.error('Error while copying to clipboard')
    }
  }

  handleCopy = handleCopy || localHandleCopy

  if (peerAddrs) {
    return (
      <Box>
        <TextField
          readOnly
          textarea
          id="addresses"
          name="addresses"
          label="Your Mintter address"
          rows={4}
          value={peerAddrs}
          containerCss={{fontSize: '$2'} as CSS}
        />
        <CopyToClipboard
          data-testid="copy-addrs-button"
          text={copyText as string}
          onCopy={handleCopy}
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

  return <Text>Loading peer info...</Text>
}
