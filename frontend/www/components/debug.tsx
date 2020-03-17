import React from 'react'

export function DebugValue({value}: any) {
  const [visible, setVisible] = React.useState(false)

  return (
    process.env.NODE_ENV === 'development' && (
      <div className="bg-yellow-500 p-4 rounded">
        {visible && (
          <pre className="text-sm whitespace-pre-wrap">
            <code>{JSON.stringify(value, null, 2)}</code>
          </pre>
        )}
        <button onClick={() => setVisible(!visible)}>{`${
          visible ? 'hide' : 'show'
        } value`}</button>
      </div>
    )
  )
}
