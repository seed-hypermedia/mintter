import React from 'react'
import {css} from 'emotion'

export default function DocumentStatus() {
  return (
    <div className="flex items-start items-center py-2">
      <div
        className={`bg-muted rounded-full mr-1 ${css`
          width: 20px;
          height: 20px;
        `}`}
      ></div>
      <p className="text-sm text-muted-hover">
        <span className="font-bold">Status: </span>
        <span className="italic font-light">Private</span>
      </p>
    </div>
  )
}
