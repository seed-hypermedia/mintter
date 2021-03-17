import * as React from 'react';
import { Textarea } from '@mintter/ui-legacy/textarea';
import { Button } from '@mintter/ui-legacy/button';
import { useProfileAddrs } from './mintter-hooks';
// import {useToasts} from 'react-toast-notifications'
import CopyToClipboard from 'react-copy-to-clipboard';

// TODO: fix types
export function ProfileAddress(props: any) {
  const { isLoading, isError, error, data } = useProfileAddrs();
  // const { addToast } = useToasts();

  const address = React.useMemo(() => data, [data]);
  const copyText = React.useMemo(() => address?.join(','), [address]);

  if (isLoading) {
    return <p>Loading...</p>;
  }

  if (isError) {
    return <p>ERROR</p>;
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
        style={{ userSelect: 'none' }}
        readOnly
        rows={4}
        id="addresses"
        className="block text-body-muted w-full border bg-background-muted border-muted rounded px-3 py-2 font-mono text-xs"
        value={address?.join('\n\n')}
      />
      <CopyToClipboard
        text={copyText as string}
        onCopy={(_, result) => {
          if (result) {
            // addToast('Address copied to your clipboard!', {
            //   appearance: 'success',
            // });
          } else {
            // addToast('Error while copying to Clipboard!', {
            //   appearance: 'error',
            // });
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
  );
}
