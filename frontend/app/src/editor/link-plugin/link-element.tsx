import {Box, Icon} from '@mintter/ui'
import type {SPRenderElementProps} from '@udecode/slate-plugins-core'
import {useMemo} from 'react'
import {MINTTER_LINK_PREFIX} from '.'
import {Tooltip} from '../../components/tooltip'
import type {EditorLink} from '../types'

export function LinkElement(props: SPRenderElementProps<EditorLink>) {
  const isMintterLink = useMemo<boolean>(() => props.element.url.startsWith(MINTTER_LINK_PREFIX), [props.element.url])

  return isMintterLink ? (
    <MintterLink data-link-id={props.element.id} {...props} />
  ) : (
    <ExternalLink data-link-id={props.element.id} {...props} />
  )
}
// TODO: add tooltip
function MintterLink({element, attributes, children, ...props}: SPRenderElementProps<EditorLink>) {
  return (
    <Tooltip content={<Box css={{maxWidth: '400px', wordBreak: 'break-all'}}>{element.url}</Box>}>
      <Box
        {...attributes}
        //@ts-ignore
        as="button"
        css={{
          appearance: 'unset',
          textDecoration: 'underline',
          wordBreak: 'break-all',
          color: '$text-default',
          border: 'none',
          fontFamily: '$alt',
          fontSize: 'inherit',
          background: 'transparent',
          '&:hover': {
            cursor: 'pointer',
          },
        }}
      >
        {children}
      </Box>
    </Tooltip>
  )
}

// TODO: add tooltip
function ExternalLink({element, attributes, children, ...props}: SPRenderElementProps<EditorLink>) {
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
  )
}
