import {useRef, useEffect, useState} from 'react'

export function useFocus() {
  const ref = useRef(null)
  const [set, setSet] = useState(false)

  useEffect(() => {
    set && ref.current.focus()
  }, [set])

  useEffect(() => {
    ref && setSet(true)
  })

  function focusFirst(elm) {
    if (elm) {
      ref.current = elm
      setSet(true)
    }
  }

  return {
    focusFirst,
  }
}
