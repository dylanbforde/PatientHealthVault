import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RecordSearch from '../record-search';
import logger from '@/lib/logger';

describe('RecordSearch', () => {
  const mockOnSearch = jest.fn();

  beforeEach(() => {
    mockOnSearch.mockClear();
  });

  it('renders search input and category select', () => {
    render(<RecordSearch onSearch={mockOnSearch} />);
    
    expect(screen.getByPlaceholderText('Search records...')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('calls onSearch with correct parameters when search button is clicked', async () => {
    render(<RecordSearch onSearch={mockOnSearch} />);
    
    const searchInput = screen.getByPlaceholderText('Search records...');
    const searchButton = screen.getByRole('button', { name: /search/i });

    await userEvent.type(searchInput, 'test search');
    fireEvent.click(searchButton);

    expect(mockOnSearch).toHaveBeenCalledWith({
      search: 'test search',
      recordType: undefined
    });

    logger.info('Search test completed successfully');
  });

  it('calls onSearch with category when category is selected', async () => {
    render(<RecordSearch onSearch={mockOnSearch} />);
    
    const categorySelect = screen.getByRole('combobox');
    fireEvent.click(categorySelect);
    
    const option = screen.getByText('Lab Results');
    fireEvent.click(option);
    
    const searchButton = screen.getByRole('button', { name: /search/i });
    fireEvent.click(searchButton);

    expect(mockOnSearch).toHaveBeenCalledWith({
      search: undefined,
      recordType: 'Lab Results'
    });

    logger.info('Category selection test completed successfully');
  });
});
