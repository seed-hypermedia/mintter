import React from 'react'
import {render} from '@testing-library/react'
import {EditorComponent} from '../editor'

function editorRender() {
  return render(<EditorComponent />)
}

test('should Render', () => {
  editorRender()
})
