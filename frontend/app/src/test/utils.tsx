import React from 'react';
import ReactDOM from 'react-dom';
import * as defaultQueries from './queries'

export function fixture(jsx) {
  const wrapper = document.createElement("div");
  ReactDOM.render(jsx, wrapper);
  return {
    element: wrapper.firstElementChild,
    restoreFixture: () => wrapper.remove(),
  };
}