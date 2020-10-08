import React from 'react'

export function Page({children}) {
  return (
    <>
      <div className="pt-4 overflow-auto row-start-2">{children}</div>
      {/* <div
        className="h-16 bg-gradient-to-t
        from-white
        via-white
        to-transparent"
      ></div> */}
    </>
  )
}
