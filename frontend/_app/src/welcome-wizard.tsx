import * as React from 'react';
import { WelcomeProvider } from './welcome-provider';

export default function WelcomeWizard() {
  return (
    <div>
      <WelcomeProvider>
        <WelcomeIntro />
      </WelcomeProvider>
    </div>
  );
}

function WelcomeIntro() {
  //TODO: add profile check
  function handleNext() {
    //
  }
  return (
    <div>
      <h1>Welcome to mintter</h1>
      <button onClick={handleNext}>next</button>
    </div>
  );
}
