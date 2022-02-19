import {ForwardedRef, forwardRef} from 'react'
import {RenderElementProps} from 'slate-react'
import {Editor} from '../editor'
import {EditorMode} from '../plugin-utils'
import {EmbedUI} from './embed-ui'
import {useEmbed} from './use-embed'

export type EmbedEditorProps = Pick<RenderElementProps, 'attributes' | 'children'> & {
  embed: string
  onClick?: any
}

export const EmbedEditor = forwardRef(RenderEmbedEditor)

function RenderEmbedEditor(
  {embed, children, attributes, ...props}: EmbedEditorProps,
  ref: ForwardedRef<HTMLQuoteElement>,
) {
  const {status, data, error} = useEmbed(embed)

  if (status == 'loading') {
    return (
      <span {...props} {...attributes} ref={ref} contentEditable={false}>
        ...
        {children}
      </span>
    )
  }
  if (status == 'error') {
    console.error('Embed Error: ', error)
    return (
      <span contentEditable={false} {...props} {...attributes} ref={ref}>
        EMBED ERROR
        {children}
      </span>
    )
  }

  return (
    <EmbedUI cite={embed} {...props} {...attributes} contentEditable={false} ref={ref}>
      <Editor
        as="span"
        mode={EditorMode.Embed}
        value={[data.statement]}
        onChange={() => {
          // noop
        }}
      />
      {children}
    </EmbedUI>
  )
}
