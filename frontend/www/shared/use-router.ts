import React from 'react'
import {
  useLocation,
  useHistory,
  useRouteMatch,
  useParams,
} from 'react-router-dom'

export function useRouter() {
  const history = useHistory()
  const match = useRouteMatch()
  const location = useLocation()

  return React.useMemo(
    () => ({
      history,
      location,
      match,
    }),
    [history, match, location],
  )
}
