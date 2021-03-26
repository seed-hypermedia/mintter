import { Switch, Route } from 'react-router-dom';

export const PublisherNode: React.FC = () => {
  return (
    <Switch>
      <Route exact path="/">
        <div>Publisher node root</div>
      </Route>
    </Switch>
  );
};
