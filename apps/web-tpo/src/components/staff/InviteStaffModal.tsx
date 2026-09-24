import { useState } from 'react';
import { Mail, User, Building } from 'lucide-react';
import { Button, FormErrorSummary, FormItem, FormLabel, Input, Modal } from '@smart/ui';
import type { InviteStaffRequest, StaffRole } from '@smart/contracts';

export interface InviteStaffModalProps {
  open: boolean;
  onClose: () => void;
  onInvite: (payload: InviteStaffRequest) => Promise<void>;
}

export function InviteStaffModal({ open, onClose, onInvite }: InviteStaffModalProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<StaffRole>('PLACEMENT_STAFF');
  const [department, setDepartment] = useState('');

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (!firstName.trim()) errors.firstName = 'First name is required.';
    if (!lastName.trim()) errors.lastName = 'Last name is required.';
    if (!email.trim()) {
      errors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Please enter a valid email address (e.g. staff@institution.edu).';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);

    if (!validate()) return;

    setSubmitting(true);
    try {
      await onInvite({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        role,
        department: department.trim() || undefined,
      });
      handleClose();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to send invitation. Please try again.';
      setServerError(message);
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    setFirstName('');
    setLastName('');
    setEmail('');
    setRole('PLACEMENT_STAFF');
    setDepartment('');
    setFieldErrors({});
    setServerError(null);
    setSubmitting(false);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Invite Staff Member"
      description="Send an official email invitation to a university placement officer or administrator."
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {serverError ? (
          <FormErrorSummary
            title="Invitation Failed"
            errors={serverError}
            onRetry={() => handleSubmit(new Event('submit') as unknown as React.FormEvent)}
          />
        ) : null}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormItem>
            <FormLabel htmlFor="firstName" required>
              First Name
            </FormLabel>
            <Input
              id="firstName"
              name="firstName"
              placeholder="e.g. Anitha"
              value={firstName}
              onChange={(e) => {
                setFirstName(e.target.value);
                if (fieldErrors.firstName) setFieldErrors((p) => ({ ...p, firstName: '' }));
              }}
              error={fieldErrors.firstName}
              startIcon={<User className="size-4" />}
            />
          </FormItem>

          <FormItem>
            <FormLabel htmlFor="lastName" required>
              Last Name
            </FormLabel>
            <Input
              id="lastName"
              name="lastName"
              placeholder="e.g. Raman"
              value={lastName}
              onChange={(e) => {
                setLastName(e.target.value);
                if (fieldErrors.lastName) setFieldErrors((p) => ({ ...p, lastName: '' }));
              }}
              error={fieldErrors.lastName}
            />
          </FormItem>
        </div>

        <FormItem>
          <FormLabel htmlFor="staffEmail" required>
            Work Email Address
          </FormLabel>
          <Input
            id="staffEmail"
            name="email"
            type="email"
            placeholder="e.g. anitha.placement@institution.edu"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: '' }));
            }}
            error={fieldErrors.email}
            startIcon={<Mail className="size-4" />}
          />
        </FormItem>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormItem>
            <FormLabel htmlFor="staffRole" required>
              Assigned Staff Role
            </FormLabel>
            <select
              id="staffRole"
              name="role"
              value={role}
              onChange={(e) => setRole(e.target.value as StaffRole)}
              className="flex h-10 w-full rounded-lg border border-[var(--ds-border,var(--surface-border))] bg-transparent px-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/50 focus:border-[var(--brand)]"
            >
              <option value="PLACEMENT_STAFF">Placement Officer (Staff)</option>
              <option value="INSTITUTION_ADMIN">Institution Admin (Full Access)</option>
            </select>
          </FormItem>

          <FormItem>
            <FormLabel htmlFor="department">Department / Office (Optional)</FormLabel>
            <Input
              id="department"
              name="department"
              placeholder="e.g. Training & Placement Cell"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              startIcon={<Building className="size-4" />}
            />
          </FormItem>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[var(--ds-border-subtle)]">
          <Button type="button" variant="outline" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={submitting}
            className="!bg-zinc-900 !text-white hover:!bg-black font-semibold shadow-xs"
          >
            Send Invitation
          </Button>
        </div>
      </form>
    </Modal>
  );
}
