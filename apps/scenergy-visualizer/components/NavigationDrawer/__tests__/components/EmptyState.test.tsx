import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { EmptyState } from '../../components/EmptyState';

vi.mock('../../NavigationDrawer.module.scss', () => ({
  default: {
    emptyStateContainer: 'emptyStateContainer',
    emptyStateMessage: 'emptyStateMessage',
    emptyStateButton: 'emptyStateButton',
  },
}));

describe('EmptyState', () => {
  it('renders the provided message', () => {
    render(<EmptyState message="No items found" />);

    expect(screen.getByText('No items found')).toBeDefined();
  });

  it('renders with action button when onAdd is provided', () => {
    const onAdd = vi.fn();
    render(<EmptyState message="No items found" onAdd={onAdd} addLabel="Add Item" />);

    const button = screen.getByText('Add Item');
    expect(button).toBeDefined();
    button.click();
    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it('renders without action button when onAdd is not provided', () => {
    render(<EmptyState message="No items found" />);

    expect(screen.queryByRole('button')).toBeNull();
  });

  it('uses default label when addLabel is not provided', () => {
    const onAdd = vi.fn();
    render(<EmptyState message="No items found" onAdd={onAdd} />);

    expect(screen.getByText('Add')).toBeDefined();
  });
});
