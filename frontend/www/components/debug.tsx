import {useState} from 'react'

export function DebugValue({value, className = ''}: any) {
  const [visible, setVisible] = useState(false)

  return (
    process.env.NODE_ENV === 'development' && (
      <div className={`my-8 bg-muted ${className}`}>
        <button
          className="px-2 py-1 bg-warning rounded text-sm"
          onClick={() => setVisible(!visible)}
        >{`${visible ? 'hide' : 'show'} value`}</button>
        {visible && (
          <div className="h-screen max-h-screen overflow-y-scroll">
            <pre className="text-sm mt-4 whitespace-pre-wrap text-body">
              <code>{JSON.stringify(value, null, 2)}</code>
            </pre>
          </div>
        )}
      </div>
    )
  )
}
