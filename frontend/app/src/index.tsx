import { StrictMode } from 'react';
import { render } from 'react-dom';

import { AppProviders } from './app-providers';
import { App } from './app';


render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
  document.getElementById('root'),
);