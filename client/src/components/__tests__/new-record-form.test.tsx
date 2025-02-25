import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NewRecordForm } from '@/pages/dashboard';
import { useAuth } from '@/hooks/use-auth';
import logger from '@/lib/logger';

// Mock useAuth hook
jest.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    user: {
      uuid: 'test-uuid',
      fullName: 'Test User'
    }
  })
}));

describe('NewRecordForm', () => {
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    mockOnSubmit.mockClear();
    logger.info('Starting NewRecordForm test');
  });

  it('renders all form fields correctly', () => {
    render(<NewRecordForm onSubmit={mockOnSubmit} />);
    
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/record type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/healthcare facility/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/diagnosis/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/treatment plan/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/medical notes/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/allow emergency access/i)).toBeInTheDocument();
    
    logger.info('Form fields render test completed');
  });

  it('submits form data correctly', async () => {
    render(<NewRecordForm onSubmit={mockOnSubmit} />);
    
    // Fill in form fields
    await userEvent.type(screen.getByLabelText(/title/i), 'Test Record');
    await userEvent.type(screen.getByLabelText(/facility/i), 'Test Hospital');
    await userEvent.type(screen.getByLabelText(/record type/i), 'General');
    await userEvent.type(screen.getByLabelText(/diagnosis/i), 'Test Diagnosis');
    await userEvent.type(screen.getByLabelText(/treatment/i), 'Test Treatment');
    await userEvent.type(screen.getByLabelText(/notes/i), 'Test Notes');
    
    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /create record/i }));
    
    expect(mockOnSubmit).toHaveBeenCalled();
    const submittedData = mockOnSubmit.mock.calls[0][0];
    expect(submittedData).toHaveProperty('title', 'Test Record');
    expect(submittedData).toHaveProperty('facility', 'Test Hospital');
    
    logger.info('Form submission test completed');
  });

  it('validates required fields', async () => {
    render(<NewRecordForm onSubmit={mockOnSubmit} />);
    
    // Try to submit without filling required fields
    fireEvent.click(screen.getByRole('button', { name: /create record/i }));
    
    // Check for validation messages
    expect(await screen.findAllByText(/required/i)).toHaveLength(4);
    expect(mockOnSubmit).not.toHaveBeenCalled();
    
    logger.info('Form validation test completed');
  });
});
