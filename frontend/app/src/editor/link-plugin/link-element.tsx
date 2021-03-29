import * as React from 'react';
import { Box } from '@mintter/ui-legacy/box';
import { Text } from '@mintter/ui-legacy/text';
import { ExternalLinkIcon } from '@mintter/ui/icons';
import { Tooltip } from '../../tooltip';
import { Link } from '../../link';

// TODO: fix types
export const LinkElement = (props: any) => {
  const isMintterLink = props.element.url.startsWith('mintter://');
  return isMintterLink ? (
    <MintterLink {...props} />
  ) : (
    <ExternalLink {...props} />
  );
};

function MintterLink({ element, attributes, children, ...props }: any) {
  const { documentId, blockId } = getMintterLinkData(element.url);
  return (
    <Tooltip
      content={
        <Box css={{ maxWidth: '400px', p: '$3', bc: 'red' }}>
          <Text css={{ wordBreak: 'break-all' }}>{documentId}</Text>
        </Box>
      }
    >
      <Box
        as={Link}
        {...attributes}
        to={element.url}
        // something is adding `type="button"` here and is braking the styles
        css={{
          appearance: 'unset !important',
          textDecoration: 'underline',
          wordBreak: 'break-all',
          '&:hover': {
            cursor: 'pointer',
          },
        }}
      >
        {children}
      </Box>
    </Tooltip>
  );
}

function ExternalLink({ element, attributes, children, ...props }: any) {
  return (
    <Tooltip
      content={
        <Box
          css={{
            display: 'flex',
            alignItems: 'center',
            gap: '$1',
            py: '$1',
          }}
        >
          <ExternalLinkIcon />
          <Text>{element.url}</Text>
        </Box>
      }
    >
      <Box
        as="a"
        {...attributes}
        onClick={() => window.open(element.url as string, '_blank')}
        href={element.url as string}
        css={{
          textDecoration: 'underline',
          display: 'inline',
          width: 'auto',
          wordBreak: 'break-all',
          '&:hover': {
            cursor: 'pointer',
          },
        }}
      >
        {children}
      </Box>
    </Tooltip>
  );
}

function getMintterLinkData(
  url: string,
): { documentId: string; blockId: string } {
  const [, values] = url.split('mintter://');
  const [documentId, blockId] = values.split('/');
  return {
    documentId,
    blockId,
  };
}
