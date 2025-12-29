import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ParticipationShortcuts, TrustMicrocopy } from './ParticipationShortcuts';
import { BrowserRouter } from 'react-router-dom';
import { sourceRegistryService } from '@/data/sourceRegistryService';

// Mock sourceRegistryService
vi.mock('@/data/sourceRegistryService', () => ({
  sourceRegistryService: {
    getShortcuts: vi.fn(),
    isUsingDegradedData: vi.fn(),
  },
}));

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

describe('ParticipationShortcuts', () => {
  const mockGetShortcuts = vi.mocked(sourceRegistryService.getShortcuts);
  const mockIsUsingDegradedData = vi.mocked(sourceRegistryService.isUsingDegradedData);

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsUsingDegradedData.mockReturnValue(false);
  });

  it('should render all shortcuts when data loads successfully', async () => {
    mockGetShortcuts.mockResolvedValue({
      hearingSchedule: {
        id: 'hearing-1',
        title: 'Hearing Schedule',
        url: 'https://schedule.example.com',
        kind: 'schedule',
      },
      councils: {
        id: 'councils-1',
        title: 'Councils',
        url: 'https://councils.example.com',
        kind: 'council',
      },
      participatoryBudgeting: {
        id: 'op-1',
        title: 'OP',
        url: 'https://budget.example.com',
        kind: 'op',
      },
      lai: {
        id: 'lai-1',
        title: 'LAI',
        url: 'https://lai.example.com',
        kind: 'lai',
      },
    });

    render(<ParticipationShortcuts />);

    await waitFor(() => {
      expect(screen.getByText('Agenda de audiências')).toBeInTheDocument();
      expect(screen.getByText('Conselhos e atas')).toBeInTheDocument();
      expect(screen.getByText('Orçamento participativo')).toBeInTheDocument();
      expect(screen.getByText('Pedir informações (LAI)')).toBeInTheDocument();
    });
  });

  it('should display links with correct URLs', async () => {
    mockGetShortcuts.mockResolvedValue({
      hearingSchedule: {
        id: 'hearing-1',
        title: 'Hearing Schedule',
        url: 'https://schedule.example.com',
        kind: 'schedule',
      },
      councils: {
        id: 'councils-1',
        title: 'Councils',
        url: 'https://councils.example.com',
        kind: 'council',
      },
      participatoryBudgeting: {
        id: 'op-1',
        title: 'OP',
        url: 'https://budget.example.com',
        kind: 'op',
      },
      lai: {
        id: 'lai-1',
        title: 'LAI',
        url: 'https://lai.example.com',
        kind: 'lai',
      },
    });

    render(<ParticipationShortcuts />);

    await waitFor(() => {
      const hearingLink = screen.getByRole('link', { name: /agenda de audiências/i });
      expect(hearingLink).toHaveAttribute('href', 'https://schedule.example.com');
      expect(hearingLink).toHaveAttribute('target', '_blank');
      expect(hearingLink).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  it('should show disabled state for shortcuts without URLs', async () => {
    mockGetShortcuts.mockResolvedValue({
      hearingSchedule: {
        id: 'hearing-1',
        title: 'Hearing Schedule',
        url: 'https://schedule.example.com',
        kind: 'schedule',
      },
      councils: undefined,
      participatoryBudgeting: undefined,
      lai: {
        id: 'lai-1',
        title: 'LAI',
        url: 'https://lai.example.com',
        kind: 'lai',
      },
    });

    render(<ParticipationShortcuts />);

    await waitFor(() => {
      expect(screen.getByText('Agenda de audiências')).toBeInTheDocument();
    });

    // Should show two disabled shortcuts (councils and participatory budgeting)
    const disabledElements = screen.getAllByText('Não encontrado');
    expect(disabledElements.length).toBe(2);
  });

  it('should display fallback URLs when registry data is missing', async () => {
    mockGetShortcuts.mockResolvedValue({
      hearingSchedule: undefined,
      councils: undefined,
      participatoryBudgeting: undefined,
      lai: undefined,
    });

    render(<ParticipationShortcuts />);

    await waitFor(() => {
      // Should still show hearing schedule and LAI with fallback URLs
      const hearingLink = screen.getByRole('link', { name: /agenda de audiências/i });
      expect(hearingLink).toBeInTheDocument();

      const laiLink = screen.getByRole('link', { name: /pedir informações/i });
      expect(laiLink).toBeInTheDocument();
    });
  });

  it('should show loading skeleton while data loads', () => {
    mockGetShortcuts.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<ParticipationShortcuts />);

    // Should show 4 skeleton loaders
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThanOrEqual(4);
  });

  it('should show degraded data alert when using degraded data', async () => {
    mockGetShortcuts.mockResolvedValue({
      hearingSchedule: {
        id: 'hearing-1',
        title: 'Hearing Schedule',
        url: 'https://schedule.example.com',
        kind: 'schedule',
      },
      councils: undefined,
      participatoryBudgeting: undefined,
      lai: {
        id: 'lai-1',
        title: 'LAI',
        url: 'https://lai.example.com',
        kind: 'lai',
      },
    });
    mockIsUsingDegradedData.mockReturnValue(true);

    render(<ParticipationShortcuts />);

    await waitFor(() => {
      expect(screen.getByText('Dados limitados')).toBeInTheDocument();
      expect(screen.getByText(/não foi possível carregar todos os atalhos/i)).toBeInTheDocument();
    });
  });

  it('should show error alert when loading fails', async () => {
    mockGetShortcuts.mockRejectedValue(new Error('Network error'));

    render(<ParticipationShortcuts />);

    await waitFor(() => {
      expect(screen.getByText('Erro ao carregar atalhos')).toBeInTheDocument();
    });
  });

  it('should still show fallback shortcuts when error occurs', async () => {
    mockGetShortcuts.mockRejectedValue(new Error('Network error'));

    render(<ParticipationShortcuts />);

    await waitFor(() => {
      // Should still render fallback shortcuts
      expect(screen.getByText('Agenda de audiências')).toBeInTheDocument();
      expect(screen.getByText('Pedir informações (LAI)')).toBeInTheDocument();
    });
  });

  it('should display external link icons', async () => {
    mockGetShortcuts.mockResolvedValue({
      hearingSchedule: {
        id: 'hearing-1',
        title: 'Hearing Schedule',
        url: 'https://schedule.example.com',
        kind: 'schedule',
      },
      councils: undefined,
      participatoryBudgeting: undefined,
      lai: {
        id: 'lai-1',
        title: 'LAI',
        url: 'https://lai.example.com',
        kind: 'lai',
      },
    });

    render(<ParticipationShortcuts />);

    await waitFor(() => {
      expect(screen.getAllByText('Link oficial').length).toBeGreaterThan(0);
    });
  });
});

describe('TrustMicrocopy', () => {
  it('should render trust message with link to sources', () => {
    render(
      <BrowserRouter>
        <TrustMicrocopy />
      </BrowserRouter>
    );

    expect(screen.getByText(/esta página é alimentada por fontes oficiais públicas/i)).toBeInTheDocument();

    const sourcesLink = screen.getByRole('link', { name: /fontes/i });
    expect(sourcesLink).toHaveAttribute('href', '/sources');
  });

  it('should mention prototype status', () => {
    render(
      <BrowserRouter>
        <TrustMicrocopy />
      </BrowserRouter>
    );

    expect(screen.getByText(/alguns recursos são protótipos/i)).toBeInTheDocument();
  });
});
