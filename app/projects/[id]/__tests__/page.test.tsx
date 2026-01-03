import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProjectDetailPage from '../page';
import { useRouter } from 'next/navigation';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

describe('ProjectDetailPage Navigation', () => {
  const mockRouter = {
    push: jest.fn(),
  };

  const mockProject = {
    _id: '123',
    name: 'Test Building',
    description: 'Test building project',
    gridX: [{ label: 'A', position: 0 }],
    gridY: [{ label: '1', position: 0 }],
    levels: [{ name: 'Ground Floor', elevation: 0 }],
  };

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({
        success: true,
        data: mockProject,
      }),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the project title correctly', async () => {
    const params = Promise.resolve({ id: '123' });
    render(<ProjectDetailPage params={params} />);

    await waitFor(() => {
      expect(screen.getByText('Test Building')).toBeInTheDocument();
    });
  });

  it('displays Parts and Reports toggle buttons', async () => {
    const params = Promise.resolve({ id: '123' });
    render(<ProjectDetailPage params={params} />);

    await waitFor(() => {
      expect(screen.getByText('🏗️ Parts')).toBeInTheDocument();
      expect(screen.getByText('📊 Reports')).toBeInTheDocument();
    });
  });

  it('displays DPWH Vol. III parts navigation', async () => {
    const params = Promise.resolve({ id: '123' });
    render(<ProjectDetailPage params={params} />);

    await waitFor(() => {
      expect(screen.getByText('Part C - Earthworks')).toBeInTheDocument();
      expect(screen.getByText('Part D - Concrete & Reinforcement')).toBeInTheDocument();
      expect(screen.getByText('Part E - Finishing & Other Civil Works')).toBeInTheDocument();
      expect(screen.getByText('Part F - Electrical')).toBeInTheDocument();
      expect(screen.getByText('Part G - Mechanical')).toBeInTheDocument();
    });
  });

  it('switches between Parts and Reports sections', async () => {
    const params = Promise.resolve({ id: '123' });
    render(<ProjectDetailPage params={params} />);

    await waitFor(() => {
      expect(screen.getByText('🏗️ Parts')).toBeInTheDocument();
    });

    const reportsButton = screen.getByText('📊 Reports');
    fireEvent.click(reportsButton);

    await waitFor(() => {
      expect(screen.getByText('Select Report:')).toBeInTheDocument();
      expect(screen.getByText('📊 Takeoff Summary')).toBeInTheDocument();
      expect(screen.getByText('📋 Bill of Quantities')).toBeInTheDocument();
    });
  });

  it('displays Part D sub-navigation tabs when Part D is active', async () => {
    const params = Promise.resolve({ id: '123' });
    render(<ProjectDetailPage params={params} />);

    await waitFor(() => {
      expect(screen.getByText('Part D - Concrete & Reinforcement')).toBeInTheDocument();
    });

    const partDButton = screen.getByText('Part D - Concrete & Reinforcement');
    fireEvent.click(partDButton);

    await waitFor(() => {
      expect(screen.getByText('Overview')).toBeInTheDocument();
      expect(screen.getByText('Grid System')).toBeInTheDocument();
      expect(screen.getByText('Levels')).toBeInTheDocument();
      expect(screen.getByText('Element Templates')).toBeInTheDocument();
      expect(screen.getByText('Element Instances')).toBeInTheDocument();
      expect(screen.getByText('Calc History')).toBeInTheDocument();
    });
  });

  it('displays Part C sub-navigation tabs when Part C is active', async () => {
    const params = Promise.resolve({ id: '123' });
    render(<ProjectDetailPage params={params} />);

    await waitFor(() => {
      expect(screen.getByText('Part C - Earthworks')).toBeInTheDocument();
    });

    const partCButton = screen.getByText('Part C - Earthworks');
    fireEvent.click(partCButton);

    await waitFor(() => {
      expect(screen.getByText('🌳 Clearing & Grubbing')).toBeInTheDocument();
      expect(screen.getByText('🪓 Removal of Trees')).toBeInTheDocument();
      expect(screen.getByText('🏚️ Removal of Structures')).toBeInTheDocument();
      expect(screen.getByText('⛏️ Excavation')).toBeInTheDocument();
      expect(screen.getByText('🏗️ Structure Excavation')).toBeInTheDocument();
      expect(screen.getByText('🚧 Embankment')).toBeInTheDocument();
      expect(screen.getByText('🏗️ Site Development')).toBeInTheDocument();
    });
  });

  it('displays Part E sub-navigation tabs when Part E is active', async () => {
    const params = Promise.resolve({ id: '123' });
    render(<ProjectDetailPage params={params} />);

    await waitFor(() => {
      expect(screen.getByText('Part E - Finishing & Other Civil Works')).toBeInTheDocument();
    });

    const partEButton = screen.getByText('Part E - Finishing & Other Civil Works');
    fireEvent.click(partEButton);

    await waitFor(() => {
      expect(screen.getByText('Spaces (Mode A)')).toBeInTheDocument();
      expect(screen.getByText('Wall Surfaces (Mode A)')).toBeInTheDocument();
      expect(screen.getByText('Finishes (Mode A)')).toBeInTheDocument();
      expect(screen.getByText('Roofing (Mode B)')).toBeInTheDocument();
      expect(screen.getByText('Schedules (Mode C)')).toBeInTheDocument();
    });
  });

  it('persists active part to localStorage', async () => {
    const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');
    const params = Promise.resolve({ id: '123' });
    render(<ProjectDetailPage params={params} />);

    await waitFor(() => {
      expect(screen.getByText('Part E - Finishing & Other Civil Works')).toBeInTheDocument();
    });

    const partEButton = screen.getByText('Part E - Finishing & Other Civil Works');
    fireEvent.click(partEButton);

    await waitFor(() => {
      expect(setItemSpy).toHaveBeenCalledWith('activePart', 'E');
    });

    setItemSpy.mockRestore();
  });

  it('displays Back to Projects button and navigates on click', async () => {
    const params = Promise.resolve({ id: '123' });
    render(<ProjectDetailPage params={params} />);

    await waitFor(() => {
      expect(screen.getByText('← Back to Projects')).toBeInTheDocument();
    });

    const backButton = screen.getByText('← Back to Projects');
    fireEvent.click(backButton);

    expect(mockRouter.push).toHaveBeenCalledWith('/projects');
  });

  it('handles loading state', () => {
    const params = Promise.resolve({ id: '123' });
    render(<ProjectDetailPage params={params} />);

    expect(screen.getByText('Loading project...')).toBeInTheDocument();
  });

  it('handles error state', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({
        success: false,
        error: 'Project not found',
      }),
    });

    const params = Promise.resolve({ id: '123' });
    render(<ProjectDetailPage params={params} />);

    await waitFor(() => {
      expect(screen.getByText('Project not found')).toBeInTheDocument();
    });
  });

  it('makes API call to fetch project data', async () => {
    const params = Promise.resolve({ id: '123' });
    render(<ProjectDetailPage params={params} />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/projects/123');
    });
  });

  it('displays project description when available', async () => {
    const params = Promise.resolve({ id: '123' });
    render(<ProjectDetailPage params={params} />);

    await waitFor(() => {
      expect(screen.getByText('Test building project')).toBeInTheDocument();
    });
  });

  it('applies correct active styles to selected part', async () => {
    const params = Promise.resolve({ id: '123' });
    const { container } = render(<ProjectDetailPage params={params} />);

    await waitFor(() => {
      expect(screen.getByText('Part D - Concrete & Reinforcement')).toBeInTheDocument();
    });

    const partDButton = screen.getByText('Part D - Concrete & Reinforcement');
    fireEvent.click(partDButton);

    await waitFor(() => {
      expect(partDButton).toHaveClass('bg-blue-500');
      expect(partDButton).toHaveClass('text-white');
    });
  });

  it('horizontal scroll container exists for sub-navigation', async () => {
    const params = Promise.resolve({ id: '123' });
    const { container } = render(<ProjectDetailPage params={params} />);

    await waitFor(() => {
      const scrollContainer = container.querySelector('.overflow-x-auto');
      expect(scrollContainer).toBeInTheDocument();
    });
  });
});
