import {blockNodeToSlate} from '@app/client/v2/block-to-slate'
import {getEmbedIds} from '@app/editor/embed'
import {usePublication} from '@app/hooks'
import {styled} from '@app/stitches.config'
import {FlowContent} from '@mintter/mttast'
import {ForwardedRef, forwardRef, memo, useMemo} from 'react'
import {RenderElementProps, useFocused, useSelected} from 'slate-react'
import {visit} from 'unist-util-visit'
import {Editor} from '../editor'
import {EditorMode} from '../plugin-utils'

export type EmbedEditorProps = Pick<
  RenderElementProps,
  'attributes' | 'children'
> & {
  embed: string
  onClick?: any
}

export const EmbedEditor = memo(forwardRef(RenderEmbedEditor))

var EmbedStyled = styled('q', {
  borderRadius: '$1',
  transition: 'all ease-in-out 0.1s',
  borderBottom: '3px solid $colors$base-component-bg-normal',

  '&:hover': {
    borderBottomColor: '$secondary-border-subtle',
    cursor: 'pointer',
  },
  '&:before, &:after': {
    display: 'none',
  },
})

function RenderEmbedEditor(
  {embed, children, attributes, ...props}: EmbedEditorProps,
  ref: ForwardedRef<HTMLQuoteElement>,
) {
  let [_docId, _version, blockId] = getEmbedIds(embed)
  let selected = useSelected()
  let focused = useFocused()
  let state = useEmbed(embed)

  if (state.status == 'error') {
    return (
      <span contentEditable={false} {...props} {...attributes} ref={ref}>
        EMBED ERROR
        {children}
      </span>
    )
  }

  if (state.status == 'success' && state.data.block) {
    return (
      <EmbedStyled
        cite={embed}
        {...props}
        {...attributes}
        contentEditable={false}
        // onMouseEnter={() => {
        //   debug('embed id:', blockId)
        //   hoverService.send({type: 'MOUSE_ENTER', blockId})
        // }}
        ref={ref}
        css={{
          backgroundColor:
            selected && focused
              ? '$primary-component-bg-active'
              : 'transparent',
          [`[data-hover-block="${blockId}"] &`]: {
            backgroundColor: '$primary-component-bg-normal',
          },
        }}
      >
        <Editor
          as="span"
          mode={EditorMode.Embed}
          value={[state.data.block]}
          onChange={() => {
            // noop
          }}
        />
        {children}
      </EmbedStyled>
    )
  }

  return (
    <span {...props} {...attributes} ref={ref} contentEditable={false}>
      ...
      {children}
    </span>
  )
}

export function useEmbed(url: string) {
  if (!url) {
    throw new Error(`useEmbed: "url" must be a valid URL string. got "${url}"`)
  }
  const [publicationId, version, blockId] = getEmbedIds(url)
  const publicationQuery = usePublication(publicationId, version)
  let block = useMemo(() => {
    let temp: FlowContent
    if (publicationQuery.data.document.children?.length) {
      // TODO: use the parent list type instead
      let slateValue = blockNodeToSlate(
        publicationQuery.data.document.children,
        'group',
      )

      visit(
        {type: 'root', children: slateValue.children} as any,
        {id: blockId},
        (node) => {
          temp = node
        },
      )
    }

    //@ts-ignore
    return temp
  }, [publicationQuery, blockId])

  return {
    ...publicationQuery,
    data: {
      ...publicationQuery.data,
      block,
    },
  }
}
