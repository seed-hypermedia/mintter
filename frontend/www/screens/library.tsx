import {Switch, Route, Link} from 'react-router-dom'

// TODO: Think if there's a better way  to disable SSR, so that access to localStorage doesn't blow up the whole app.
export function Library(props) {
  return (
    <div>
      <nav>
        <ul className="flex items-center">
          <li className="mx-4 p-4">
            <Link to="/">Home</Link>
          </li>
          <li className="mx-4 p-4">
            <Link to="/about">About</Link>
          </li>
          <li className="mx-4 p-4">
            <Link to="/users">Users</Link>
          </li>
        </ul>
      </nav>

      {/* A <Switch> looks through its children <Route>s and
              renders the first one that matches the current URL. */}
      <Switch>
        <Route path="/about">
          <About />
        </Route>
        <Route path="/users">
          <Users />
        </Route>
        <Route path="/">
          <Home />
        </Route>
      </Switch>
    </div>
  )
}

function Home() {
  return <h2>Home</h2>
}

function About() {
  return <h2>About</h2>
}

function Users() {
  return <h2>Users</h2>
}
