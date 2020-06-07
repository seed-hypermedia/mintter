import {Switch, Route, Link} from 'react-router-dom'
import {LibraryHeader} from 'components/library-header'

// TODO: Think if there's a better way  to disable SSR, so that access to localStorage doesn't blow up the whole app.
export function Library(props) {
  return (
    <div>
      <LibraryHeader />
    </div>
  )
}
