import React from 'react';
import { expect } from '@esm-bundle/chai';
import { SecurityPack } from './security-pack';
import { AppProviders } from '../../app-providers';
import { fireEvent, render, screen } from '@testing-library/react';
import { waitFor } from '@testing-library/dom';

describe('Security Pack', () => {
  it('Renders correctly', () => {
    render(
      <AppProviders>
        <SecurityPack />
      </AppProviders>,
    );

    fireEvent.click(screen.getByTestId(/button-toogle-custom-seed/i));
    expect(document.body.contains(screen.getByTestId(/textarea-own-seed/i)));
  });
});
