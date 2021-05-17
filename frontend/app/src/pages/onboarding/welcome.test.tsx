import React from 'react';
import { expect } from '@esm-bundle/chai';
import { Welcome } from './welcome';
import { fixture } from 'test/utils';
import { screen, render, waitFor, fireEvent } from '@testing-library/react'
import { AppProviders } from '../../app-providers';

it('<Welcome />', async () => {
  
  render(<AppProviders><Welcome next={() => {}} prev={() => {}} /></AppProviders>)
  
  screen.getByText(/Welcome to Mintter/i)
  screen.getByTestId(/next-button/i)
  
});
