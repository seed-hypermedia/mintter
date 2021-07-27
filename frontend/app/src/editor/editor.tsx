import {useState} from 'react'
import {useCallback} from 'react'
import {Slate} from 'slate-react'
import {Editable} from 'slate-react'
import {buildRenderElement} from './utils'

export function Editor({editor, plugins, value = [{text: ''}]}) {
  const [stateValue, setValue] = useState(value)
  console.log('🚀 ~ file: editor.tsx ~ line 9 ~ Editor ~ v', stateValue)
  const renderElement = useCallback(buildRenderElement(plugins), [plugins])
  return (
    <Slate
      editor={editor}
      // TODO: uncomment this when is fixed!
      value={stateValue}
      // value={[{value: ''}]}
      onChange={(newValue) => setValue(newValue)}
    >
      <Editable renderElement={renderElement} />
      <pre>{JSON.stringify(value, null, 2)}</pre>
    </Slate>
  )
}
