import Input from 'components/input'
import Textarea from 'components/textarea'
import {useProfileContext} from 'shared/profileContext'
import {ErrorMessage} from './errorMessage'
import {useMemo} from 'react'
import {Button} from './button'
import {useToasts} from 'react-toast-notifications'

export function ProfileAddress(props) {
  const {getProfileAddrs} = useProfileContext()

  const {status, error, data} = getProfileAddrs()
  const {addToast} = useToasts()

  const address = useMemo(() => data?.toObject().addrsList, [data])
  // console.log('ProfileAddress -> address', address)

  if (status === 'loading') {
    return <p>Loading...</p>
  }

  if (status === 'error') {
    return <ErrorMessage error={error} />
  }

  function handleCopy(address: string[]) {
    const value = address.join(',')

    navigator.clipboard
      .writeText(value)
      .then(() =>
        addToast('Address copied to your clipboard!', {appearance: 'success'}),
      )
  }

  return (
    <div {...props}>
      <label
        className="block text-body-muted text-xs font-semibold mb-1"
        htmlFor="addresses"
      >
        your Mintter addresses
      </label>
      {address?.length <= 2 && (
        <p className="block w-full border bg-background-muted border-muted rounded px-3 py-2 focus:outline-none focus:border-muted-hover transition duration-200 text-body-muted focus:text-body opacity-75 mb-4">
          Establishing connection...
        </p>
      )}
      <Textarea
        style={{userSelect: 'none'}}
        readOnly
        rows={4}
        id="addresses"
        className="block text-body-muted w-full border bg-background-muted border-muted rounded px-3 py-2 font-mono text-xs"
        value={address && address.join('\n\n')}
      />
      <Button
        className="mx-auto mt-4 text-success transition duration-200 border border-success opacity-100 hover:bg-success hover:border-success hover:text-white"
        type="button"
        onClick={() => handleCopy(address)}
      >
        Copy Address
      </Button>
    </div>
  )
}
