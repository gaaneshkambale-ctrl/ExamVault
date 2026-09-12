import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CreateUser from './CreateUser';
import ManageUsers from './ManageUsers';
import * as userHooks from '../../hooks/useUsers';

// Mock AdminLayout to isolate page testing
vi.mock('../../layouts/AdminLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('CreateUser Page', () => {
  it('renders Bulk Import button and Back to Users button', () => {
    renderWithProviders(<CreateUser />);

    // Verify "Bulk Import" button exists on Add User page
    expect(screen.getByRole('link', { name: /bulk import/i })).toBeInTheDocument();

    // Verify "Back to Users" button exists
    expect(screen.getByRole('link', { name: /back to users/i })).toBeInTheDocument();
  });
});

describe('ManageUsers Page', () => {
  it('does NOT render Bulk Import button, and DOES render Delete buttons', () => {
    vi.spyOn(userHooks, 'useUsers').mockReturnValue({
      data: [
        {
          id: 'user-1',
          fullName: 'John Doe',
          email: 'john@example.com',
          role: 'Student',
          isActive: true,
          createdAtUtc: '2026-01-01T00:00:00Z',
          hasPhoto: false,
        },
      ],
      isLoading: false,
      isError: false,
    } as ReturnType<typeof userHooks.useUsers>);

    renderWithProviders(<ManageUsers />);

    // Verify table renders user
    expect(screen.getByText('John Doe')).toBeInTheDocument();

    // Verify "Bulk Import" button is NOT on ManageUsers page
    expect(screen.queryByRole('link', { name: /bulk import/i })).not.toBeInTheDocument();

    // Verify View, Edit, and Delete action buttons exist on row
    expect(screen.getByRole('link', { name: /view john doe/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /edit john doe/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete john doe/i })).toBeInTheDocument();
  });
});
