import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Badge,
  StatusBadge,
  Modal,
  FormItem,
  FormLabel,
  FormDescription,
  FormMessage,
  FormSection,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../index';

describe('Shared UI Primitives Suite', () => {
  describe('Card Component', () => {
    it('renders default, highlighted, and glass variants with subcomponents', () => {
      const { rerender } = render(
        <Card variant="highlighted" hoverable data-testid="card">
          <CardHeader>
            <CardTitle>Cohort Readiness</CardTitle>
            <CardDescription>Overview of student certifications</CardDescription>
          </CardHeader>
          <CardContent>Body Data</CardContent>
          <CardFooter>Footer Action</CardFooter>
        </Card>,
      );

      expect(screen.getByText('Cohort Readiness')).toBeDefined();
      expect(screen.getByText('Body Data')).toBeDefined();
      expect(screen.getByText('Footer Action')).toBeDefined();

      rerender(
        <Card variant="glass" data-testid="card">
          Glass Content
        </Card>,
      );
      expect(screen.getByText('Glass Content')).toBeDefined();
    });
  });

  describe('Badge & StatusBadge Components', () => {
    it('renders Badge variants and dot indicators', () => {
      render(
        <div>
          <Badge variant="success" dot>
            Passed
          </Badge>
          <Badge variant="warning">Pending Review</Badge>
          <Badge variant="teal">Verified</Badge>
        </div>,
      );

      expect(screen.getByText('Passed')).toBeDefined();
      expect(screen.getByText('Pending Review')).toBeDefined();
      expect(screen.getByText('Verified')).toBeDefined();
    });

    it('renders StatusBadge for pending, verified, completed, and in_progress states', () => {
      render(
        <div>
          <StatusBadge status="verified" />
          <StatusBadge status="pending" />
          <StatusBadge status="in_progress" label="Evaluating..." />
          <StatusBadge status="failed" />
        </div>,
      );

      expect(screen.getByText('Verified')).toBeDefined();
      expect(screen.getByText('Pending')).toBeDefined();
      expect(screen.getByText('Evaluating...')).toBeDefined();
      expect(screen.getByText('Failed')).toBeDefined();
    });
  });

  describe('Modal Component', () => {
    it('renders modal when open=true and closes on Escape or backdrop click', () => {
      const handleClose = vi.fn();
      const { rerender } = render(
        <Modal
          open={true}
          onClose={handleClose}
          title="Approve Candidate"
          description="Grant L1 readiness certificate"
          footer={<button type="button">Confirm</button>}
        >
          <div>Modal Body Content</div>
        </Modal>,
      );

      expect(screen.getByRole('dialog')).toBeDefined();
      expect(screen.getByText('Approve Candidate')).toBeDefined();
      expect(screen.getByText('Modal Body Content')).toBeDefined();

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(handleClose).toHaveBeenCalledTimes(1);

      rerender(
        <Modal open={false} onClose={handleClose}>
          Hidden
        </Modal>,
      );
      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });

  describe('Form Controls Component', () => {
    it('renders FormSection, FormLabel, FormDescription, and FormMessage error', () => {
      render(
        <FormSection title="Student Profile" description="Basic details">
          <FormItem>
            <FormLabel htmlFor="student-name" required>
              Full Name
            </FormLabel>
            <FormDescription>Legal name on official records</FormDescription>
            <FormMessage error="Name cannot be empty" />
          </FormItem>
        </FormSection>,
      );

      expect(screen.getByText('Student Profile')).toBeDefined();
      expect(screen.getByText('Full Name')).toBeDefined();
      expect(screen.getByText('Name cannot be empty')).toBeDefined();
      expect(screen.getByRole('alert').textContent).toBe('Name cannot be empty');
    });
  });

  describe('Table Suite Component', () => {
    it('renders structured table with headers and rows', () => {
      render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>Sathesh V</TableCell>
              <TableCell>
                <StatusBadge status="verified" />
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>,
      );

      expect(screen.getByText('Student')).toBeDefined();
      expect(screen.getByText('Sathesh V')).toBeDefined();
      expect(screen.getByText('Verified')).toBeDefined();
    });
  });
});
