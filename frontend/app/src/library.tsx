import * as React from 'react';
import { useRouteMatch, match as Match } from 'react-router-dom';

export default function Library() {
  const match = useRouteMatch() as Match;

  return <div>library here</div>;
  // TODO: add library code
}
