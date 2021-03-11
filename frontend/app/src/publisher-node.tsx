import * as React from 'react';
import { Switch, Route } from 'react-router-dom';

export default function PublisherNode() {
  return (
    <Switch>
      <Route exact path="/">
        <div>Publisher node root</div>
      </Route>
    </Switch>
  );
}
