import type { SlateTextRun } from '@mintter/hooks';
import { Box } from '@mintter/ui/box';
import type { TRenderElementProps } from '@udecode/slate-plugins-core';
import { useEffect, useMemo } from 'react';
import { Link } from '@components/link';
import { MINTTER_LINK_PREFIX } from '.';
import { Tooltip } from '@components/tooltip';
import { Icon } from '@mintter/ui/icon';
import {SlateLink} from '../types'


export function LinkElement(props: TRenderElementProps<SlateLink>) {
  const isMintterLink = useMemo<boolean>(
    () => props.element.url.startsWith(MINTTER_LINK_PREFIX),
    [props.element.url],
  );
  
  useEffect(() => {
    console.log({[props.element.id]: props.element})
  }, [props.element.id])
  return isMintterLink ? (
    <MintterLink {...props} />
  ) : (
    <ExternalLink {...props} />
  );
}
// TODO: add tooltip
function MintterLink({
  element,
  attributes,
  children,
  ...props
}: TRenderElementProps<SlateLink>) {
  return (
    <Tooltip
      content={
        <Box css={{ maxWidth: '400px', wordBreak: 'break-all' }}>
          {element.url}
        </Box>
      }
    >
      <Box
        as={Link}
        {...attributes}
        to={element.url} // something is adding `type="button"` here and is braking the styles
        css={{
          background: 'blue',
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

// TODO: add tooltip
function ExternalLink({
  element,
  attributes,
  children,
  ...props
}: TRenderElementProps<SlateLink>) {
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
