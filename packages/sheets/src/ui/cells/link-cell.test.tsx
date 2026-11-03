import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { SheetLinkCell } from './link-cell.js';

describe('SheetLinkCell', () => {
  it('links its text to href', () => {
    render(<SheetLinkCell href="/projects/7">Project Seven</SheetLinkCell>);
    const link = screen.getByRole('link', { name: 'Project Seven' });
    expect(link.getAttribute('href')).toBe('/projects/7');
  });

  it("renders through the app's own link component", () => {
    function RouterLink({
      children,
      ...props
    }: {
      href: string;
      className?: string;
      children?: ReactNode;
    }) {
      return (
        <a data-router="" {...props}>
          {children}
        </a>
      );
    }
    render(
      <SheetLinkCell href="/projects/7" LinkComponent={RouterLink}>
        Project Seven
      </SheetLinkCell>,
    );

    const link = screen.getByRole('link', { name: 'Project Seven' });
    expect(link.hasAttribute('data-router')).toBe(true);
    expect(link.getAttribute('href')).toBe('/projects/7');
    // The cell's styling still reaches the app's link.
    expect(link.className).toContain('text-sheet-link');
  });
});
