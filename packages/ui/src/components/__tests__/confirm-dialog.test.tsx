import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from '../confirm-dialog';

describe('ConfirmDialog Suite', () => {
  it('renders title, description, cancel, and confirm buttons when open=true', () => {
    const handleClose = vi.fn();
    const handleConfirm = vi.fn();

    render(
      <ConfirmDialog
        open={true}
        onClose={handleClose}
        onConfirm={handleConfirm}
        title="Revoke Verification?"
        description="This will cancel the active credential."
        confirmText="Revoke"
        variant="danger"
      />,
    );

    expect(screen.getByRole('alertdialog')).toBeDefined();
    expect(screen.getByText('Revoke Verification?')).toBeDefined();
    expect(screen.getByText('This will cancel the active credential.')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Revoke' })).toBeDefined();
  });

  it('clicking Cancel calls onClose and does not call onConfirm', () => {
    const handleClose = vi.fn();
    const handleConfirm = vi.fn();

    render(
      <ConfirmDialog
        open={true}
        onClose={handleClose}
        onConfirm={handleConfirm}
        title="Delete Candidate Record?"
        description="Permanent action."
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(handleClose).toHaveBeenCalledTimes(1);
    expect(handleConfirm).not.toHaveBeenCalled();
  });

  it('clicking Confirm triggers onConfirm', async () => {
    const handleClose = vi.fn();
    const handleConfirm = vi.fn().mockResolvedValue(undefined);

    render(
      <ConfirmDialog
        open={true}
        onClose={handleClose}
        onConfirm={handleConfirm}
        title="Delete Batch?"
        description="Action cannot be undone."
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => {
      expect(handleConfirm).toHaveBeenCalledTimes(1);
    });
  });

  it('disables buttons and shows spinner when isLoading=true (double-click prevention)', () => {
    const handleClose = vi.fn();
    const handleConfirm = vi.fn();

    render(
      <ConfirmDialog
        open={true}
        onClose={handleClose}
        onConfirm={handleConfirm}
        title="Deleting Record..."
        description="Please wait."
        isLoading={true}
      />,
    );

    const confirmBtn = screen.getByRole('button', { name: 'Delete' });
    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });

    expect(confirmBtn.getAttribute('aria-busy')).toBe('true');
    expect(confirmBtn.getAttribute('disabled')).not.toBeNull();
    expect(cancelBtn.getAttribute('disabled')).not.toBeNull();
  });

  it('displays error message when error prop is provided', () => {
    render(
      <ConfirmDialog
        open={true}
        onClose={() => {}}
        onConfirm={() => {}}
        title="Delete Candidate?"
        description="Cannot undo."
        error="Server error: Failed to delete candidate."
      />,
    );

    expect(screen.getByRole('alert').textContent).toBe('Server error: Failed to delete candidate.');
  });
});
