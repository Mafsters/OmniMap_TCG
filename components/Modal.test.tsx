import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import Modal from './Modal';

describe('Modal', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('renders nothing when isOpen is false', () => {
    render(
      <Modal isOpen={false} onClose={() => {}} title="Test">
        <p>Content</p>
      </Modal>
    );
    expect(screen.queryByRole('heading', { name: /test/i })).not.toBeInTheDocument();
    expect(screen.queryByText('Content')).not.toBeInTheDocument();
  });

  it('renders title and children when isOpen is true after animation frame', async () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="Test Modal">
        <p>Modal content</p>
      </Modal>
    );
    await vi.runAllTimersAsync();
    expect(screen.getByRole('heading', { name: /test modal/i })).toBeInTheDocument();
    expect(screen.getByText('Modal content')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={onClose} title="Test">
        <p>Content</p>
      </Modal>
    );
    await vi.runAllTimersAsync();
    const buttons = screen.getAllByRole('button');
    const closeButton = buttons[buttons.length - 1];
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
