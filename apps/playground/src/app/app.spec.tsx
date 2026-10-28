import { render, screen } from '@testing-library/react';

import App from './app';

describe('App', () => {
  it('renders the playground heading', () => {
    render(<App />);
    expect(
      screen.getByRole('heading', { name: 'Sheets playground' }),
    ).toBeInTheDocument();
  });
});
