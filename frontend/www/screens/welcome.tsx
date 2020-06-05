import {Switch, Route, Link} from 'react-router-dom'

// TODO: Think if there's a better way  to disable SSR, so that access to localStorage doesn't blow up the whole app.
export function Welcome(props) {
  return (
    <div>
      <nav>
        <ul className="flex items-center">
          <li className="mx-4 p-4">
            <Link to="/welcome">Welcome</Link>
          </li>
          <li className="mx-4 p-4">
            <Link to="/welcome/1">step 1</Link>
          </li>
          <li className="mx-4 p-4">
            <Link to="/welcome/2">step 2</Link>
          </li>
        </ul>
      </nav>

      {/* A <Switch> looks through its children <Route>s and
              renders the first one that matches the current URL. */}
      <Switch>
        <Route path="/welcome/1">
          <About />
        </Route>
        <Route path="/welcome/2">
          <Users />
        </Route>
        <Route path="/welcome">
          <Home />
        </Route>
      </Switch>
    </div>
  )
}

function Home() {
  return <h2>Welcome</h2>
}

function About() {
  return <h2>Step 1</h2>
}

function Users() {
  return <h2>Step 2</h2>
}
