import {useState} from 'react'
import {useCallback} from 'react'
import {Slate} from 'slate-react'
import {Editable} from 'slate-react'
import {buildRenderElement} from './utils'

export function Editor({editor, plugins, value}) {
  const [stateValue, setValue] = useState(value)
  const renderElement = useCallback(buildRenderElement(plugins), [plugins])
  return (
    <Slate editor={editor} value={stateValue} onChange={(newValue) => setValue(newValue)}>
      <Editable renderElement={renderElement} />
      <pre>{JSON.stringify(stateValue, null, 2)}</pre>
    </Slate>
  )
}
