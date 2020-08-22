import React from 'react'
import {EditorComponent} from '../editor'
import {render} from '@testing-library/react'

function editorRender() {
  return render(<EditorComponent />)
}

xtest('should Render', () => {
  editorRender()
})
