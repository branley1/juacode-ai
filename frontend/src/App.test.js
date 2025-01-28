import React from 'react';
import { render, act } from '@testing-library/react';
import App from './App';

test('App component renders without crashing', () => {
  render(<App />);
  // You can add more specific assertions here later, e.g., check for specific text or elements if needed.
  // For now, just ensure it renders without errors.
});