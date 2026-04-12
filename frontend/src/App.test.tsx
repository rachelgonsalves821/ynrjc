import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders LangUp auth or loading', () => {
  render(<App />);
  expect(screen.getByText(/loading|langup/i)).toBeInTheDocument();
});
