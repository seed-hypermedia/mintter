import {useCallback} from 'react'
import {Slate} from 'slate-react'
import {Editable} from 'slate-react'
import {buildRenderElement} from './utils'

export function Editor({editor, plugins, value = [{text: ''}]}) {
  const renderElement = useCallback(buildRenderElement(plugins), [plugins])
  return (
    <Slate
      editor={editor}
      value={value}
      onChange={(v) => {
        console.log('value!!', v)
      }}
    >
      <Editable renderElement={renderElement} />
      <pre>{JSON.stringify(value, null, 2)}</pre>
    </Slate>
  )
}
