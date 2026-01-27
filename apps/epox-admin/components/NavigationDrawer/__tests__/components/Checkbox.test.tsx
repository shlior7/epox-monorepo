import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { Checkbox } from '../../components/Checkbox';

vi.mock(
  '../../NavigationDrawer.module.scss',
  () => ({
    default: {
      checkbox: 'checkbox',
      checkboxSelected: 'checkboxSelected',
    },
  }),
  { virtual: true }
);

describe('Checkbox', () => {
  it('renders unchecked state', () => {
    const { container } = render(<Checkbox checked={false} />);
    const checkbox = container.firstChild as HTMLElement;

    expect(checkbox.className).not.toContain('checkboxSelected');
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('renders checked state', () => {
    const { container } = render(<Checkbox checked />);
    const checkbox = container.firstChild as HTMLElement;

    expect(checkbox.className).toContain('checkboxSelected');
  });
});
