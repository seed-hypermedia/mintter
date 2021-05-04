import { useMemo } from 'react';
import CopyToClipboard from 'react-copy-to-clipboard';
import toast from 'react-hot-toast';

import { Box } from '@mintter/ui/box';
import { Button } from '@mintter/ui/button';
import { TextField } from '@mintter/ui/text-field';
import { useProfileAddrs } from '@mintter/hooks';

export function ProfileAddress() {
  const profileAddress = useProfileAddrs();

  const address = useMemo(() => profileAddress.data, [profileAddress.data]);
  const copyText = useMemo(() => address?.join(','), [address]);

  if (profileAddress.isLoading) {
    return <p>Loading...</p>;
  }

  if (profileAddress.isError) {
    return <p>ERROR</p>;
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
        value={address?.join('\n\n')}
      />
      <CopyToClipboard
        text={copyText as string}
        onCopy={(_, result) => {
          if (result) {
            toast.success('Address copied to your clipboard!');
          } else {
            toast.error('Error while copying to clipboard');
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
