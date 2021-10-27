import {forwardRef, PropsWithChildren} from 'react'
import {Editor} from '../editor'
import {EditorMode} from '../plugin-utils'
import {EmbedUI} from './embed-ui'
import {useEmbed} from './use-embed'

export type EmbedEditorProps = PropsWithChildren<{
  embed: string
  onClick?: any
}>
export const EmbedEditor = forwardRef<HTMLElement, EmbedEditorProps>(function ForwardedEmbedEditor(
  {embed, children, ...props},
  ref,
) {
  const {status, data, error} = useEmbed(embed)

  if (status == 'loading') {
    return (
      <span {...props} contentEditable={false}>
        ...
        {children}
      </span>
    )
  }
  if (status == 'error') {
    console.error('Embed Error: ', error)
    return (
      <span contentEditable={false} {...props}>
        EMBED ERROR
        {children}
      </span>
    )
  }

  return (
    <EmbedUI ref={ref} cite={embed} {...props} contentEditable={false}>
      <Editor mode={EditorMode.Embed} value={[data.statement]} />
      {children}
    </EmbedUI>
  )
})
