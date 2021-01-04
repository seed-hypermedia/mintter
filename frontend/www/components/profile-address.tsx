import React from 'react'
import Textarea from 'components/textarea'
import {useProfileContext} from 'shared/profile-context'
import {ErrorMessage} from './error-message'
import {useMemo} from 'react'
import {Button} from './button'
import {useToasts} from 'react-toast-notifications'
import {CopyToClipboard} from 'react-copy-to-clipboard'

export function ProfileAddress(props) {
  const {getProfileAddrs} = useProfileContext()

  const {isLoading, isError, error, data} = getProfileAddrs()
  const {addToast} = useToasts()

  const address = useMemo(() => data?.toObject().addrsList, [data])
  const copyText = React.useMemo(() => address?.join(','), [address])

  if (isLoading) {
    return <p>Loading...</p>
  }

  if (isError) {
    return <ErrorMessage error={error} />
  }

  return (
    <div {...props}>
      <label
        className="block text-body-muted text-xs font-semibold mb-1"
        htmlFor="addresses"
      >
        your Mintter addresses
      </label>
      <Textarea
        style={{userSelect: 'none'}}
        readOnly
        rows={4}
        id="addresses"
        className="block text-body-muted w-full border bg-background-muted border-muted rounded px-3 py-2 font-mono text-xs"
        value={address?.join('\n\n')}
      />
      <CopyToClipboard
        text={copyText}
        onCopy={(_, result) => {
          if (result) {
            addToast('Address copied to your clipboard!', {
              appearance: 'success',
            })
          } else {
            addToast('Error while copying to Clipboard!', {
              appearance: 'error',
            })
          }
        }}
      >
        <Button
          className="mx-auto mt-4 text-success transition duration-200 border border-success opacity-100 hover:bg-success hover:border-success hover:text-white"
          type="button"
        >
          Copy Address
        </Button>
      </CopyToClipboard>
    </div>
  )
}
