import {BlockToolsProvider} from '@app/editor/block-tools-context'
import {blockToolsMachine} from '@app/editor/block-tools-machine'
import {useInterpret} from '@xstate/react'

export function TestPublicationProvider({children}) {
  const blockToolsService = useInterpret(() => blockToolsMachine)
  return (
    <BlockToolsProvider value={blockToolsService}>
      {children}
    </BlockToolsProvider>
  )
}
