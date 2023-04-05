import {Root} from '@app/root'
import {StrictMode} from 'react'
import {createRoot} from 'react-dom/client'

var container = document.getElementById('root')
if (!container) throw new Error('No `root` html element')
var root = createRoot(container)

root.render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
