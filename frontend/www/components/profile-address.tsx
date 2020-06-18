import Input from 'components/input'
import Textarea from 'components/textarea'
import {useProfile} from 'shared/profileContext'
import {ErrorMessage} from './errorMessage'
import {useMemo} from 'react'
import {Button} from './button'

export function ProfileAddress(props) {
  const {getProfileAddrs} = useProfile()

  const {status, error, data} = getProfileAddrs()

  const address = useMemo(() => data?.toObject().addrsList, [data])

  if (status === 'loading') {
    return <p>...</p>
  }

  if (status === 'error') {
    return <ErrorMessage error={error} />
  }

  function handleCopy(address: string[]) {
    const value = address.join(',')

    navigator.clipboard
      .writeText(value)
      .then(() => alert('Address copied to your clipboard!'))
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
        readOnly
        minHeight={200}
        id="addresses"
        className="block text-body-muted w-full border bg-background-muted border-muted rounded px-3 py-2 font-mono text-xs"
        value={address && address.join('\n\n')}
      />
      <Button
        className="mx-auto mt-4 text-success transition duration-200 border border-success opacity-100 hover:bg-success hover:border-success hover:text-white transition-all"
        type="submit"
        onClick={() => handleCopy(address)}
      >
        Copy Address
      </Button>
    </div>
  )
}
