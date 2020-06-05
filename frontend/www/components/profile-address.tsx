import Input from 'components/input'
import Textarea from 'components/textarea'
import {useProfile} from 'shared/profileContext'
import {ErrorMessage} from './errorMessage'

export function ProfileAddress(props) {
  const {getProfileAddrs} = useProfile()

  const {status, error, data} = getProfileAddrs()

  if (status === 'loading') {
    return <p>...</p>
  }

  if (status === 'error') {
    return <ErrorMessage error={error} />
  }

  const address = data?.toObject().addrsList
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
        className="block text-body-muted w-full border bg-background-muted border-muted rounded px-3 py-2"
        value={address && address.join('\n\n')}
      />
    </div>
  )
}
