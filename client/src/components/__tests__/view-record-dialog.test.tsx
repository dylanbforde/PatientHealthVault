import { render, screen, fireEvent } from '@testing-library/react';
import { ViewRecordDialog } from '@/pages/dashboard';
import logger from '@/lib/logger';

// Mock record data
const mockRecord = {
  id: 1,
  title: "Test Record",
  date: new Date().toISOString(),
  recordType: "General",
  facility: "Test Hospital",
  content: {
    diagnosis: "Test Diagnosis",
    treatment: "Test Treatment",
    notes: "Test Notes"
  },
  isEmergencyAccessible: false,
  sharedWith: [],
  patientUuid: "test-uuid",
  status: "accepted",
  verifiedAt: null,
  verifiedBy: null,
  signature: null
};

describe('ViewRecordDialog', () => {
  beforeEach(() => {
    logger.info('Starting ViewRecordDialog test');
  });

  it('displays record details correctly', () => {
    render(<ViewRecordDialog record={mockRecord} />);
    
    // Check if main record details are displayed
    expect(screen.getByText(mockRecord.title)).toBeInTheDocument();
    expect(screen.getByText(mockRecord.facility)).toBeInTheDocument();
    expect(screen.getByText(mockRecord.recordType)).toBeInTheDocument();
    
    // Check if content is displayed
    expect(screen.getByText(mockRecord.content.diagnosis)).toBeInTheDocument();
    expect(screen.getByText(mockRecord.content.treatment)).toBeInTheDocument();
    expect(screen.getByText(mockRecord.content.notes)).toBeInTheDocument();
    
    logger.info('Record details test completed');
  });

  it('handles tab switching correctly', () => {
    render(<ViewRecordDialog record={mockRecord} />);
    
    // Check if both tabs are present
    const detailsTab = screen.getByRole('tab', { name: /record details/i });
    const sharingTab = screen.getByRole('tab', { name: /sharing/i });
    
    // Test tab switching
    fireEvent.click(sharingTab);
    expect(screen.getByText(/sharing/i)).toBeInTheDocument();
    
    fireEvent.click(detailsTab);
    expect(screen.getByText(/record details/i)).toBeInTheDocument();
    
    logger.info('Tab switching test completed');
  });
});
