import {ipcRenderer} from 'electron'
import {useState, MouseEvent, useEffect} from 'react'
import './App.css'

function App() {
  let [id, setId] = useState('')
  let [shouldShareCoords, setshouldShareCoords] = useState(false)
  let [coords, setCoords] = useState({x: 100, y: 100})

  async function getWindowId() {
    let res = await window.api.getWindowId()
    setId(res)
  }

  function handleClick(url: string) {
    return async function clickEvent() {
      let res = await window.api.openWindow(url)
      console.log('RES', res)
    }
  }

  function handleMouseCoords(event: MouseEvent<HTMLDivElement>) {
    window.api.sendCoords({x: event.clientX, y: event.clientY})
  }

  useEffect(() => {
    if (shouldShareCoords) {
      window.api.handleCoords((event, newCoords) => {
        console.log('HANDLE COORDS', newCoords)
        setCoords(newCoords)
      })
    }
  }, [coords])

  return (
    <div
      className="App"
      onMouseMove={shouldShareCoords ? handleMouseCoords : undefined}
    >
      <div
        style={{
          width: 20,
          height: 20,
          borderRadius: 10,
          backgroundColor: 'yellow',
          position: 'absolute',
          top: 0,
          left: 0,
          transform: `translate(${coords.y}px, ${coords.x}px)`,
        }}
      />
      <h1>Electron Mintter demo</h1>
      <h3>{window.location.href}</h3>
      <button disabled={isSameURL('/')} onClick={handleClick('/')}>
        open Home (/)
      </button>
      <button disabled={isSameURL('/foo')} onClick={handleClick('/foo')}>
        open /foo
      </button>
      <button disabled={isSameURL('/bar')} onClick={handleClick('/bar')}>
        open /bar
      </button>
      <button onClick={getWindowId}>window ID: {id}</button>
      <label>
        <input
          type="checkbox"
          checked={shouldShareCoords}
          onChange={(event) => setshouldShareCoords(event.target.value)}
        />
        Share mouse coords
      </label>
      <p>Copy this text to see if we can share information between windows</p>
      <textarea placeholder="paste content here"></textarea>
    </div>
  )
}

function isSameURL(url: string) {
  return window.location.href == `http://localhost:5173${url}`
}

export default App
