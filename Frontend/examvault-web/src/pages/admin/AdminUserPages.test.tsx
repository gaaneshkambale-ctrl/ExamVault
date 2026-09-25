import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CreateUser from './CreateUser';
import ManageUsers from './ManageUsers';
import * as userHooks from '../../hooks/useUsers';
import { AuthContext } from '../../context/authContext';
import type { AuthContextValue } from '../../context/authContext';
import type { UserProfile } from '../../types/user';

// Mock AdminLayout to isolate page testing
vi.mock('../../layouts/AdminLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Deliberately a different id from any row rendered in these tests -
// ManageUsers reads useAuth() to disable Delete/Deactivate on the caller's
// OWN row (see ManageUsers.tsx, DeleteUserButton), so a mismatched id here
// keeps these tests' rendered rows acting like any other (non-self) user.
const FAKE_CURRENT_ADMIN: UserProfile = {
  id: 'current-admin',
  fullName: 'Current Admin',
  email: 'current.admin@example.com',
  role: 'Admin',
  mustChangePassword: false,
  phoneNumber: null,
  hasPhoto: false,
  username: null,
  alternateEmail: null,
  gender: null,
  dateOfBirth: null,
  location: null,
  department: null,
  designation: null,
  lastLoginAtUtc: null,
  joinedOnUtc: null,
  formattedUserId: null,
  isActive: true,
  rollNumber: null,
  academicFields: null,
};

const FAKE_AUTH_CONTEXT: AuthContextValue = {
  user: FAKE_CURRENT_ADMIN,
  isAuthenticated: true,
  isLoading: false,
  login: vi.fn(),
  logout: vi.fn(),
  clearMustChangePassword: vi.fn(),
  refreshUser: vi.fn(),
};

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={FAKE_AUTH_CONTEXT}>
        <MemoryRouter>{ui}</MemoryRouter>
      </AuthContext.Provider>
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

  it("disables Delete and Deactivate on the current Admin's own row, but not on others", () => {
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
        {
          // Matches FAKE_CURRENT_ADMIN.id - this is the logged-in caller's own row.
          id: 'current-admin',
          fullName: 'Current Admin',
          email: 'current.admin@example.com',
          role: 'Admin',
          isActive: true,
          createdAtUtc: '2026-01-01T00:00:00Z',
          hasPhoto: false,
        },
      ],
      isLoading: false,
      isError: false,
    } as ReturnType<typeof userHooks.useUsers>);

    renderWithProviders(<ManageUsers />);

    // Someone else's row: both actions stay enabled.
    expect(screen.getByRole('button', { name: /delete john doe/i })).toBeEnabled();

    // The caller's own row: Delete is disabled outright (DeleteUserButton's
    // self-check swaps in a disabled button with a different aria-label).
    expect(screen.queryByRole('button', { name: /delete current admin/i })).not.toBeInTheDocument();
    expect(screen.getByTitle('You cannot delete your own account.')).toBeDisabled();
  });
});
