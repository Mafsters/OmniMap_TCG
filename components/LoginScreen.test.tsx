import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LoginScreen from './LoginScreen';
import type { Employee } from '../types';

const mockEmployees: Employee[] = [
  {
    id: 'e1',
    name: 'Alice',
    role: 'PM',
    department: 'Product',
    accessLevel: 'Admin',
  },
  {
    id: 'e2',
    name: 'Bob',
    role: 'Engineer',
    department: 'Tech',
    accessLevel: 'IC',
  },
];

describe('LoginScreen', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'location', { value: { hostname: 'localhost' }, writable: true });
    Object.defineProperty(window, 'google', { value: undefined, writable: true });
  });

  it('renders login UI and shows employees after dev login unlock', async () => {
    const onLogin = vi.fn();
    render(<LoginScreen employees={mockEmployees} onLogin={onLogin} />);
    const showDevButton = screen.getByRole('button', { name: /show dev login/i });
    fireEvent.click(showDevButton);
    const devInput = screen.getByPlaceholderText(/enter dev code/i);
    fireEvent.change(devInput, { target: { value: '123' } });
    fireEvent.click(screen.getByRole('button', { name: /unlock/i }));
    expect(await screen.findByText(/alice/i)).toBeInTheDocument();
    expect(screen.getByText(/bob/i)).toBeInTheDocument();
  });

  it('calls onLogin with selected employee when dev login is used', async () => {
    const onLogin = vi.fn();
    render(<LoginScreen employees={mockEmployees} onLogin={onLogin} />);
    fireEvent.click(screen.getByRole('button', { name: /show dev login/i }));
    fireEvent.change(screen.getByPlaceholderText(/enter dev code/i), { target: { value: '123' } });
    fireEvent.click(screen.getByRole('button', { name: /unlock/i }));
    const aliceButton = await screen.findByRole('button', { name: /alice/i });
    fireEvent.click(aliceButton);
    expect(onLogin).toHaveBeenCalledTimes(1);
    expect(onLogin).toHaveBeenCalledWith(mockEmployees[0]);
  });
});
