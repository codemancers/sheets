import { render, screen } from '@testing-library/react';

import App from './app';

describe('App', () => {
  it('renders every demo', () => {
    render(<App />);
    expect(
      screen.getByRole('heading', { name: 'Sheets playground' }),
    ).toBeInTheDocument();
    for (const name of [
      'Sorting and row actions',
      'Inline editing',
      'Adding rows',
      'Loading and empty states',
      '1,000 rows',
    ]) {
      expect(screen.getByRole('region', { name })).toBeInTheDocument();
    }
  });
});
