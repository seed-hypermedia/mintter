import {CitationsProvider, createCitationsMachine} from '@app/editor/citations'
import {Editor} from '@app/editor/editor'
import {buildEditorHook, EditorMode} from '@app/editor/plugin-utils'
import {plugins} from '@app/editor/plugins'
import {MainPageProviders, mountWithAccount} from '@app/test/utils'
import {Box} from '@components/box'
import {group, ol, paragraph, statement, text, ul} from '@mintter/mttast'
import {useInterpret} from '@xstate/react'
import {useMemo} from 'react'
import {QueryClient} from 'react-query'

function TestEditor({value, client}: {value: any; client: QueryClient}) {
  const editor = useMemo(
    () => buildEditorHook(plugins, EditorMode.Publication),
    [],
  )

  const citations = useInterpret(() => createCitationsMachine(client))

  return (
    <Box css={{padding: '$9'}}>
      <MainPageProviders client={client}>
        <CitationsProvider value={citations}>
          <Editor
            mode={EditorMode.Publication}
            editor={editor}
            value={value}
            onChange={() => {
              // noop
            }}
          />
        </CitationsProvider>
      </MainPageProviders>
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
      const {render, client} = mountWithAccount()
      render(<TestEditor value={value} client={client} />)
      cy.get('[data-element-type="statement"]')
    })
  })
})
