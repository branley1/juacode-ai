import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import InputArea from './InputArea';

test('InputArea renders and allows input', () => {
  render(<InputArea setMessages={() => {}} messages={[]} />); 
  const textareaElement = screen.getByRole('textbox', { name: /chat input/i }); 
  expect(textareaElement).toBeInTheDocument();

  fireEvent.change(textareaElement, { target: { value: 'Hello test' } }); 
  expect(textareaElement.value).toBe('Hello test');
});