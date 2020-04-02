import React from 'react'

export function DebugValue({value}: any) {
  const [visible, setVisible] = React.useState(false)

  return (
    process.env.NODE_ENV === 'development' && (
      <div className="bg-muted my-8 p-4 rounded">
        {visible && (
          <pre className="text-sm whitespace-pre-wrap text-body">
            <code>{JSON.stringify(value, null, 2)}</code>
          </pre>
        )}
        <button
          className="px-4 py-2 bg-warning rounded"
          onClick={() => setVisible(!visible)}
        >{`${visible ? 'hide' : 'show'} value`}</button>
      </div>
    )
  )
}
