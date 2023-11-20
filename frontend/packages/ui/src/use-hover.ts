import {useMemo, useState} from 'react'

export function useHover() {
  const [hover, setHover] = useState(false)

  return useMemo(
    () => ({
      hover,
      onHoverIn: () => setHover(true),
      onHoverOut: () => setHover(false),
    }),
    [hover],
  )
}
