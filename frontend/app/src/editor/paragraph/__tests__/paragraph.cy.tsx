import {Editor} from '@app/editor/editor'
import {buildEditorHook, EditorMode} from '@app/editor/plugin-utils'
import {plugins} from '@app/editor/plugins'
import {FileProvider} from '@app/file-provider'
import {mountProviders} from '@app/test/utils'
import {Box} from '@components/box'
import {group, ol, paragraph, statement, text, ul} from '@mintter/mttast'
import {useMemo} from 'react'
import {QueryClient} from 'react-query'

function TestEditor({value, client}: {value: any; client: QueryClient}) {
  const editor = useMemo(
    () => buildEditorHook(plugins, EditorMode.Publication),
    [],
  )

  return (
    <Box css={{padding: '$9'}}>
      <FileProvider value={{type: 'draft', documentId: 'foo'}}>
        <Editor
          mode={EditorMode.Publication}
          editor={editor}
          value={value}
          onChange={() => {
            // noop
          }}
        />
      </FileProvider>
    </Box>
  )
}

describe('Editor Element Fixtures', () => {
  var values = [
    {
      name: 'group > statement',
      value: [group([statement([paragraph([text('Statement in a group')])])])],
    },
    {
      name: 'ordered > statement',
      value: [
        ol([statement([paragraph([text('Statement in an Ordered list')])])]),
      ],
    },
    {
      name: 'unordered > statement',
      value: [
        ul([statement([paragraph([text('Statement in an Unordered list')])])]),
      ],
    },
  ]

  values.forEach((fixture) => {
    let {name, value} = fixture
    it(name, () => {
      const {render, client} = mountProviders()
      render(<TestEditor value={value} client={client} />)
      cy.get('[data-element-type="statement"]')
    })
  })
})
