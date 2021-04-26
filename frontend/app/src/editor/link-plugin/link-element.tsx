import * as React from 'react';

import { Box } from '@mintter/ui/box';
import { Icon } from '@mintter/ui/icon';

import { Tooltip } from '../../components/tooltip';
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

function MintterLink({ element, attributes, children }: any) {
  const { documentId /* , blockId */ } = getMintterLinkData(element.url);
  return (
    <Tooltip
      content={
        <Box css={{ maxWidth: '400px', wordBreak: 'break-all' }}>
          {documentId}
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
          color: '$text-default',

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

function ExternalLink({ element, attributes, children }: any) {
  return (
    <Tooltip
      content={
        <Box
          css={{
            display: 'flex',
            alignItems: 'center',
            gap: '$2',
          }}
        >
          <Icon name="ExternalLink" color="opposite" size="1" />
          {element.url}
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
          color: '$text-default',
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
