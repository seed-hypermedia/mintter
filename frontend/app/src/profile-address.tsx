import * as React from 'react';
import { Textarea } from '@components/textarea';
import { Button } from '@mintter/ui/button';
import { useProfileAddrs } from './mintter-hooks';
// import {useToasts} from 'react-toast-notifications'
import CopyToClipboard from 'react-copy-to-clipboard';
import { Label } from '@radix-ui/react-label';
import { Box } from '@mintter/ui/box';

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
    <Box {...props}>
      <Label htmlFor="addresses">your Mintter addresses</Label>
      <Textarea
        style={{ userSelect: 'none' }}
        readOnly
        rows={4}
        id="addresses"
        value={address?.join('\n\n')}
        css={{
          marginTop: '$2',
        }}
      />
      <CopyToClipboard
        text={copyText as string}
        onCopy={(_, result) => {
          if (result) {
            console.log('Address copied to your clipboard!');

            // addToast('Address copied to your clipboard!', {
            //   appearance: 'success',
            // });
          } else {
            console.log('Error while copying to Clipboard!');

            // addToast('Error while copying to Clipboard!', {
            //   appearance: 'error',
            // });
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
  );
}
