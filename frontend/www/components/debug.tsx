import {useState} from 'react'

export function DebugValue({value, className = ''}: any) {
  const [visible, setVisible] = useState(false)

  return (
    process.env.NODE_ENV === 'development' && (
      <div className={`my-8 ${className}`}>
        <button
          className="px-2 py-1 bg-warning rounded text-sm float-right mr-4"
          onClick={() => setVisible(!visible)}
        >{`${visible ? 'hide' : 'show'} value`}</button>
        {visible && (
          <div className="pt-8">
            <pre className="text-xs mt-4 whitespace-pre-wrap text-body">
              <code>{JSON.stringify(value, null, 2)}</code>
            </pre>
          </div>
        )}
      </div>
    )
  )
}
