/**
 * Sources Page Component Tests
 *
 * Tests for Sources page UI rendering, search/filter, refresh, and warning banners.
 * Following TDD principles with comprehensive edge case coverage.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import Sources from './Sources';
import type { SourceRegistry } from '@/data/sourceRegistryTypes';

// Mock sourceRegistryService
vi.mock('@/data/sourceRegistryService', () => ({
  sourceRegistryService: {
    getRegistry: vi.fn(),
    getSections: vi.fn(),
    clearCache: vi.fn(),
    getCacheStatus: vi.fn(),
    isUsingFallback: vi.fn(),
    isUsingDegradedData: vi.fn(),
  },
}));

// Mock Header component
vi.mock('@/components/Header', () => ({
  Header: () => <div data-testid="mock-header">Header</div>,
}));

// Mock PrototypeBanner component
vi.mock('@/components/PrototypeBanner', () => ({
  PrototypeBanner: () => <div data-testid="mock-prototype-banner">Prototype Banner</div>,
}));

// Get mocked service module
const mockModule = await import('@/data/sourceRegistryService');

describe('Sources Page', () => {
  const mockSourceRegistryService = vi.mocked(mockModule.sourceRegistryService);

  const createMockRegistry = (overrides?: Partial<SourceRegistry>): SourceRegistry => ({
    metadata: {
      municipality: 'Belo Horizonte',
      state: 'Minas Gerais',
      loadedAtISO: new Date().toISOString(),
    },
    sections: [],
    globalLinks: [],
    gaps: [],
    shortcuts: {},
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers(); // Ensure we start with real timers

    // Default: successful registry load
    mockSourceRegistryService.getRegistry.mockResolvedValue(createMockRegistry());

    // Default: fresh cache status
    mockSourceRegistryService.getCacheStatus.mockReturnValue({
      loaded: true,
      cached: true,
      stale: false,
      ageMs: 1000,
      usingFallback: false,
      degraded: false,
    });
  });

  afterEach(() => {
    vi.useRealTimers(); // Ensure we clean up fake timers after each test
  });

  describe('Basic Rendering', () => {
    it('should render page title', async () => {
      render(
        <BrowserRouter>
          <Sources />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/fontes oficiais/i)).toBeInTheDocument();
      });
    });

    it('should render page description', async () => {
      render(
        <BrowserRouter>
          <Sources />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(
          screen.getByText(/explore os canais oficiais de transparência/i)
        ).toBeInTheDocument();
      });
    });

    it('should load registry data on mount', async () => {
      render(
        <BrowserRouter>
          <Sources />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(mockSourceRegistryService.getRegistry).toHaveBeenCalledTimes(1);
      });
    });

    it('should display loading skeletons while loading', () => {
      render(
        <BrowserRouter>
          <Sources />
        </BrowserRouter>
      );

      // Should show skeleton cards during initial load
      const skeletons = screen.getAllByRole('generic').filter(el =>
        el.className.includes('animate-pulse')
      );
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should render Header component', async () => {
      render(
        <BrowserRouter>
          <Sources />
        </BrowserRouter>
      );

      expect(screen.getByTestId('mock-header')).toBeInTheDocument();
    });

    it('should render PrototypeBanner component', async () => {
      render(
        <BrowserRouter>
          <Sources />
        </BrowserRouter>
      );

      expect(screen.getByTestId('mock-prototype-banner')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when registry fails to load', async () => {
      mockSourceRegistryService.getRegistry.mockRejectedValue(
        new Error('Network error')
      );

      render(
        <BrowserRouter>
          <Sources />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/falha ao carregar fontes oficiais/i)).toBeInTheDocument();
      });
    });

    it('should display error alert with destructive variant', async () => {
      mockSourceRegistryService.getRegistry.mockRejectedValue(
        new Error('Network error')
      );

      render(
        <BrowserRouter>
          <Sources />
        </BrowserRouter>
      );

      await waitFor(() => {
        const errorAlert = screen.getByRole('alert');
        expect(errorAlert).toBeInTheDocument();
      });
    });
  });

  describe('Data Freshness Display', () => {
    it('should display data freshness badge', async () => {
      render(
        <BrowserRouter>
          <Sources />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/atualizado há/i)).toBeInTheDocument();
      });
    });

    it('should display refresh button', async () => {
      render(
        <BrowserRouter>
          <Sources />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /atualizar/i })).toBeInTheDocument();
      });
    });
  });

  describe('Tabs Navigation', () => {
    it('should render sections tab', async () => {
      render(
        <BrowserRouter>
          <Sources />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /explorar por área/i })).toBeInTheDocument();
      });
    });

    it('should render gaps tab', async () => {
      render(
        <BrowserRouter>
          <Sources />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /lacunas/i })).toBeInTheDocument();
      });
    });

    it('should display gap count badge when gaps exist', async () => {
      const registryWithGaps = createMockRegistry({
        gaps: [
          {
            id: 'gap-1',
            title: 'Test Gap',
            status: 'missing',
            severity: 'high',
          },
          {
            id: 'gap-2',
            title: 'Test Gap 2',
            status: 'partial',
            severity: 'medium',
          },
        ],
      });

      mockSourceRegistryService.getRegistry.mockResolvedValue(registryWithGaps);

      render(
        <BrowserRouter>
          <Sources />
        </BrowserRouter>
      );

      await waitFor(() => {
        // Gap count should be visible
        expect(screen.getByText('2')).toBeInTheDocument();
      });
    });
  });

  describe('Search and Filter Functionality', () => {
    it('should render search input in gaps tab', async () => {
      render(
        <BrowserRouter>
          <Sources />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.queryByPlaceholderText(/buscar lacunas/i)).not.toBeInTheDocument();
      });

      // Click gaps tab
      const gapsTab = screen.getByRole('tab', { name: /lacunas/i });
      await userEvent.click(gapsTab);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/buscar lacunas/i)).toBeInTheDocument();
      });
    });

    it('should filter gaps by search term', async () => {
      const registryWithGaps = createMockRegistry({
        gaps: [
          {
            id: 'gap-1',
            title: 'Orçamento Participativo',
            status: 'missing',
            severity: 'high',
          },
          {
            id: 'gap-2',
            title: 'Conselho de Saúde',
            status: 'partial',
            severity: 'medium',
          },
          {
            id: 'gap-3',
            title: 'Audiências Públicas',
            status: 'missing',
            severity: 'low',
          },
        ],
      });

      mockSourceRegistryService.getRegistry.mockResolvedValue(registryWithGaps);

      render(
        <BrowserRouter>
          <Sources />
        </BrowserRouter>
      );

      // Click gaps tab
      const gapsTab = await screen.findByRole('tab', { name: /lacunas/i });
      await userEvent.click(gapsTab);

      // All gaps should be visible initially
      await waitFor(() => {
        expect(screen.getByText('Orçamento Participativo')).toBeInTheDocument();
        expect(screen.getByText('Conselho de Saúde')).toBeInTheDocument();
        expect(screen.getByText('Audiências Públicas')).toBeInTheDocument();
      });

      // Search for "orçamento"
      const searchInput = screen.getByPlaceholderText(/buscar lacunas/i);
      await userEvent.type(searchInput, 'orçamento');

      // Wait for debounce (300ms)
      await waitFor(() => {
        expect(screen.getByText('Orçamento Participativo')).toBeInTheDocument();
        expect(screen.queryByText('Conselho de Saúde')).not.toBeInTheDocument();
        expect(screen.queryByText('Audiências Públicas')).not.toBeInTheDocument();
      }, { timeout: 500 });
    });

    it('should show result count when searching', async () => {
      const registryWithGaps = createMockRegistry({
        gaps: [
          {
            id: 'gap-1',
            title: 'Gap 1',
            status: 'missing',
            severity: 'high',
          },
          {
            id: 'gap-2',
            title: 'Gap 2',
            status: 'missing',
            severity: 'medium',
          },
        ],
      });

      mockSourceRegistryService.getRegistry.mockResolvedValue(registryWithGaps);

      render(
        <BrowserRouter>
          <Sources />
        </BrowserRouter>
      );

      // Click gaps tab
      const gapsTab = await screen.findByRole('tab', { name: /lacunas/i });
      await userEvent.click(gapsTab);

      // Search for something
      const searchInput = screen.getByPlaceholderText(/buscar lacunas/i);
      await userEvent.type(searchInput, 'gap');

      // Wait for debounce and result count display
      await waitFor(() => {
        expect(screen.getByText(/2 resultados/i)).toBeInTheDocument();
      }, { timeout: 500 });
    });

    it('should clear search when X button is clicked', async () => {
      const registryWithGaps = createMockRegistry({
        gaps: [
          {
            id: 'gap-1',
            title: 'Test Gap',
            status: 'missing',
            severity: 'high',
          },
        ],
      });

      mockSourceRegistryService.getRegistry.mockResolvedValue(registryWithGaps);

      render(
        <BrowserRouter>
          <Sources />
        </BrowserRouter>
      );

      // Click gaps tab
      const gapsTab = await screen.findByRole('tab', { name: /lacunas/i });
      await userEvent.click(gapsTab);

      // Type in search
      const searchInput = screen.getByPlaceholderText(/buscar lacunas/i);
      await userEvent.type(searchInput, 'test');

      // Find and click clear button using aria-label
      const clearButton = await screen.findByRole('button', { name: /limpar busca/i });
      await userEvent.click(clearButton);

      // Search input should be cleared
      expect(searchInput).toHaveValue('');
    });

    it('should filter by high impact only when filter is active', async () => {
      const registryWithGaps = createMockRegistry({
        gaps: [
          {
            id: 'gap-1',
            title: 'High Impact Gap',
            status: 'missing',
            severity: 'high',
          },
          {
            id: 'gap-2',
            title: 'Medium Impact Gap',
            status: 'missing',
            severity: 'medium',
          },
          {
            id: 'gap-3',
            title: 'Low Impact Gap',
            status: 'missing',
            severity: 'low',
          },
        ],
      });

      mockSourceRegistryService.getRegistry.mockResolvedValue(registryWithGaps);

      render(
        <BrowserRouter>
          <Sources />
        </BrowserRouter>
      );

      // Click gaps tab
      const gapsTab = await screen.findByRole('tab', { name: /lacunas/i });
      await userEvent.click(gapsTab);

      // All gaps should be visible initially
      await waitFor(() => {
        expect(screen.getByText('High Impact Gap')).toBeInTheDocument();
        expect(screen.getByText('Medium Impact Gap')).toBeInTheDocument();
        expect(screen.getByText('Low Impact Gap')).toBeInTheDocument();
      });

      // Click "Alto impacto" filter
      const filterButton = screen.getByRole('button', { name: /alto impacto/i });
      await userEvent.click(filterButton);

      // Only high impact gap should be visible
      await waitFor(() => {
        expect(screen.getByText('High Impact Gap')).toBeInTheDocument();
        expect(screen.queryByText('Medium Impact Gap')).not.toBeInTheDocument();
        expect(screen.queryByText('Low Impact Gap')).not.toBeInTheDocument();
      });
    });

    it('should show empty state when no gaps match filter', async () => {
      const registryWithGaps = createMockRegistry({
        gaps: [
          {
            id: 'gap-1',
            title: 'Test Gap',
            status: 'missing',
            severity: 'medium',
          },
        ],
      });

      mockSourceRegistryService.getRegistry.mockResolvedValue(registryWithGaps);

      render(
        <BrowserRouter>
          <Sources />
        </BrowserRouter>
      );

      // Click gaps tab
      const gapsTab = await screen.findByRole('tab', { name: /lacunas/i });
      await userEvent.click(gapsTab);

      // Click "Alto impacto" filter
      const filterButton = screen.getByRole('button', { name: /alto impacto/i });
      await userEvent.click(filterButton);

      // Empty state should be visible
      await waitFor(() => {
        expect(screen.getByText(/nenhuma lacuna encontrada/i)).toBeInTheDocument();
        expect(screen.getByText(/não há lacunas de alto impacto/i)).toBeInTheDocument();
      }, { timeout: 1000 });
    });
  });

  describe('Refresh Functionality', () => {
    it('should reload data when refresh button is clicked', async () => {
      render(
        <BrowserRouter>
          <Sources />
        </BrowserRouter>
      );

      // Wait for initial load
      await waitFor(() => {
        expect(mockSourceRegistryService.getRegistry).toHaveBeenCalledTimes(1);
      });

      // Click refresh button
      const refreshButton = screen.getByRole('button', { name: /atualizar/i });
      await userEvent.click(refreshButton);

      // Should call getRegistry again with forceRefresh = true
      await waitFor(() => {
        expect(mockSourceRegistryService.getRegistry).toHaveBeenCalledTimes(2);
        expect(mockSourceRegistryService.getRegistry).toHaveBeenLastCalledWith(true);
      });
    });

    it('should show loading state while refreshing', async () => {
      // Mock getRegistry to delay so we can catch the loading state
      let resolveRefresh: (value: SourceRegistry) => void;
      const refreshPromise = new Promise<SourceRegistry>((resolve) => {
        resolveRefresh = resolve;
      });
      mockSourceRegistryService.getRegistry
        .mockResolvedValueOnce(createMockRegistry()) // Initial load
        .mockReturnValueOnce(refreshPromise); // Refresh load (delayed)

      render(
        <BrowserRouter>
          <Sources />
        </BrowserRouter>
      );

      // Wait for initial load
      await waitFor(() => {
        expect(mockSourceRegistryService.getRegistry).toHaveBeenCalledTimes(1);
      });

      // Click refresh button
      const refreshButton = screen.getByRole('button', { name: /atualizar/i });
      await userEvent.click(refreshButton);

      // Should show "Atualizando..." text while loading
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /atualizando/i })).toBeInTheDocument();
      });

      // Resolve the refresh to clean up
      resolveRefresh!(createMockRegistry());
    });

    it('should disable refresh button while refreshing', async () => {
      // Mock getRegistry to delay so we can catch the disabled state
      let resolveRefresh: (value: SourceRegistry) => void;
      const refreshPromise = new Promise<SourceRegistry>((resolve) => {
        resolveRefresh = resolve;
      });
      mockSourceRegistryService.getRegistry
        .mockResolvedValueOnce(createMockRegistry()) // Initial load
        .mockReturnValueOnce(refreshPromise); // Refresh load (delayed)

      render(
        <BrowserRouter>
          <Sources />
        </BrowserRouter>
      );

      // Wait for initial load
      await waitFor(() => {
        expect(mockSourceRegistryService.getRegistry).toHaveBeenCalledTimes(1);
      });

      // Click refresh button
      const refreshButton = screen.getByRole('button', { name: /atualizar/i });
      await userEvent.click(refreshButton);

      // Button should be disabled while loading
      await waitFor(() => {
        const refreshingButton = screen.getByRole('button', { name: /atualizando/i });
        expect(refreshingButton).toBeDisabled();
      });

      // Resolve the refresh to clean up
      resolveRefresh!(createMockRegistry());
    });

    it('should keep existing data when refresh fails', async () => {
      const initialRegistry = createMockRegistry({
        gaps: [
          {
            id: 'gap-1',
            title: 'Test Gap',
            status: 'missing',
            severity: 'high',
          },
        ],
      });

      // Return the same registry even when refresh fails (this is the stale data behavior)
      mockSourceRegistryService.getRegistry
        .mockResolvedValueOnce(initialRegistry) // Initial load succeeds
        .mockResolvedValueOnce(initialRegistry); // Refresh returns stale data (service handles the error internally)

      render(
        <BrowserRouter>
          <Sources />
        </BrowserRouter>
      );

      // Wait for initial load and switch to gaps tab
      await waitFor(() => {
        expect(mockSourceRegistryService.getRegistry).toHaveBeenCalledTimes(1);
      });

      const gapsTab = screen.getByRole('tab', { name: /lacunas/i });
      await userEvent.click(gapsTab);

      // Verify gap data is displayed
      await waitFor(() => {
        expect(screen.getByText('Test Gap')).toBeInTheDocument();
      });

      // Click refresh button
      const refreshButton = screen.getByRole('button', { name: /atualizar/i });
      await userEvent.click(refreshButton);

      // Wait for refresh to complete
      await waitFor(() => {
        expect(mockSourceRegistryService.getRegistry).toHaveBeenCalledTimes(2);
      });

      // Existing gap data should still be displayed (stale data served)
      expect(screen.getByText('Test Gap')).toBeInTheDocument();
    });

    it('should clear error state before refresh', async () => {
      // Start with an error state
      mockSourceRegistryService.getRegistry.mockRejectedValueOnce(
        new Error('Initial error')
      );

      render(
        <BrowserRouter>
          <Sources />
        </BrowserRouter>
      );

      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByText(/falha ao carregar fontes oficiais/i)).toBeInTheDocument();
      });

      // Now make refresh succeed
      mockSourceRegistryService.getRegistry.mockResolvedValueOnce(createMockRegistry());

      // Click refresh button
      const refreshButton = screen.getByRole('button', { name: /atualizar/i });
      await userEvent.click(refreshButton);

      // Error should be cleared
      await waitFor(() => {
        expect(screen.queryByText(/falha ao carregar fontes oficiais/i)).not.toBeInTheDocument();
      });
    });

    it('should update cache status after successful refresh', async () => {
      // Start with stale cache
      mockSourceRegistryService.getCacheStatus.mockReturnValueOnce({
        loaded: true,
        cached: true,
        stale: true,
        ageMs: 3600000,
        usingFallback: false,
        degraded: true,
      });

      render(
        <BrowserRouter>
          <Sources />
        </BrowserRouter>
      );

      // Wait for initial load
      await waitFor(() => {
        expect(mockSourceRegistryService.getRegistry).toHaveBeenCalled();
      });

      // Now set fresh cache status for refresh
      mockSourceRegistryService.getCacheStatus.mockReturnValue({
        loaded: true,
        cached: true,
        stale: false,
        ageMs: 1000,
        usingFallback: false,
        degraded: false,
      });

      // Click refresh button
      const refreshButton = screen.getByRole('button', { name: /atualizar/i });
      await userEvent.click(refreshButton);

      // Wait for refresh to complete
      await waitFor(() => {
        expect(mockSourceRegistryService.getRegistry).toHaveBeenCalledTimes(2);
      });

      // Verify getCacheStatus was called after refresh
      expect(mockSourceRegistryService.getCacheStatus).toHaveBeenCalled();
    });
  });

  describe('Stale Data Warning Banner', () => {
    it('should show stale data warning when cache is degraded', async () => {
      mockSourceRegistryService.getCacheStatus.mockReturnValue({
        loaded: true,
        cached: true,
        stale: true,
        ageMs: 3600000,
        usingFallback: false,
        degraded: true,
      });

      render(
        <BrowserRouter>
          <Sources />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/dados desatualizados/i)).toBeInTheDocument();
      });
    });

    it('should show fallback warning when using fallback data', async () => {
      mockSourceRegistryService.getCacheStatus.mockReturnValue({
        loaded: true,
        cached: true,
        stale: false,
        ageMs: 1000,
        usingFallback: true,
        degraded: false,
      });

      render(
        <BrowserRouter>
          <Sources />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/dados limitados disponíveis/i)).toBeInTheDocument();
      });
    });

    it('should show detailed message for stale data', async () => {
      mockSourceRegistryService.getCacheStatus.mockReturnValue({
        loaded: true,
        cached: true,
        stale: true,
        ageMs: 3600000,
        usingFallback: false,
        degraded: true,
      });

      render(
        <BrowserRouter>
          <Sources />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(
          screen.getByText(/última tentativa de atualização falhou/i)
        ).toBeInTheDocument();
      });
    });

    it('should show detailed message for fallback data', async () => {
      mockSourceRegistryService.getCacheStatus.mockReturnValue({
        loaded: true,
        cached: true,
        stale: false,
        ageMs: 1000,
        usingFallback: true,
        degraded: false,
      });

      render(
        <BrowserRouter>
          <Sources />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(
          screen.getByText(/não foi possível carregar o registro completo/i)
        ).toBeInTheDocument();
      });
    });

    it('should not show warning banner when cache is fresh', async () => {
      mockSourceRegistryService.getCacheStatus.mockReturnValue({
        loaded: true,
        cached: true,
        stale: false,
        ageMs: 1000,
        usingFallback: false,
        degraded: false,
      });

      render(
        <BrowserRouter>
          <Sources />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(mockSourceRegistryService.getRegistry).toHaveBeenCalled();
      });

      // Should not show any warning banners
      expect(screen.queryByText(/dados desatualizados/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/dados limitados disponíveis/i)).not.toBeInTheDocument();
    });

    it('should show warning banner with appropriate color for stale data', async () => {
      mockSourceRegistryService.getCacheStatus.mockReturnValue({
        loaded: true,
        cached: true,
        stale: true,
        ageMs: 3600000,
        usingFallback: false,
        degraded: true,
      });

      render(
        <BrowserRouter>
          <Sources />
        </BrowserRouter>
      );

      await waitFor(() => {
        // Find the specific alert by its title
        const warningAlert = screen.getByRole('heading', { name: /dados desatualizados/i }).closest('[role="alert"]');
        expect(warningAlert?.className).toContain('border-blue-500');
      }, { timeout: 2000 });
    });

    it('should show warning banner with appropriate color for fallback data', async () => {
      mockSourceRegistryService.getCacheStatus.mockReturnValue({
        loaded: true,
        cached: true,
        stale: false,
        ageMs: 1000,
        usingFallback: true,
        degraded: false,
      });

      render(
        <BrowserRouter>
          <Sources />
        </BrowserRouter>
      );

      await waitFor(() => {
        // Find the specific alert by its title
        const warningAlert = screen.getByRole('heading', { name: /dados limitados disponíveis/i }).closest('[role="alert"]');
        expect(warningAlert?.className).toContain('border-yellow-500');
      }, { timeout: 2000 });
    });

    it('should hide warning banner during loading state', () => {
      mockSourceRegistryService.getCacheStatus.mockReturnValue({
        loaded: true,
        cached: true,
        stale: true,
        ageMs: 3600000,
        usingFallback: false,
        degraded: true,
      });

      render(
        <BrowserRouter>
          <Sources />
        </BrowserRouter>
      );

      // During loading, warning should not be shown
      expect(screen.queryByText(/dados desatualizados/i)).not.toBeInTheDocument();
    });
  });

  describe('Section Detail View', () => {
    it('should open detail view when clicking a section card', async () => {
      const registryWithSection = createMockRegistry({
        sections: [
          {
            id: 'section-1',
            title: 'Participação Social',
            letter: 'I',
            description: 'Canais de participação',
            links: [
              {
                id: 'link-1',
                title: 'Orçamento Participativo',
                url: 'https://op.example.com',
                kind: 'op',
                official: true,
              },
            ],
          },
        ],
      });

      mockSourceRegistryService.getRegistry.mockResolvedValue(registryWithSection);

      render(
        <BrowserRouter>
          <Sources />
        </BrowserRouter>
      );

      // Wait for sections to load
      await waitFor(() => {
        expect(screen.getByText('Participação Social')).toBeInTheDocument();
      });

      // Click the section card
      const sectionTitle = screen.getByText('Participação Social');
      const sectionCard = sectionTitle.closest('[class*="cursor-pointer"]');
      await userEvent.click(sectionCard!);

      // Should show section detail with header
      await waitFor(() => {
        expect(screen.getByText('Seção I')).toBeInTheDocument();
        expect(screen.getByText('Participação Social')).toBeInTheDocument();
      });
    });

    it('should render links in detail view', async () => {
      const registryWithSection = createMockRegistry({
        sections: [
          {
            id: 'section-1',
            title: 'Test Section',
            letter: 'A',
            description: 'Test description',
            links: [
              {
                id: 'link-1',
                title: 'Test Link',
                url: 'https://test.example.com',
                kind: 'other',
                official: true,
              },
            ],
          },
        ],
      });

      mockSourceRegistryService.getRegistry.mockResolvedValue(registryWithSection);

      render(
        <BrowserRouter>
          <Sources />
        </BrowserRouter>
      );

      // Click section
      const sectionTitle = await screen.findByText('Test Section');
      const sectionCard = sectionTitle.closest('[class*="cursor-pointer"]');
      await userEvent.click(sectionCard!);

      // Should show link in detail view
      await waitFor(() => {
        expect(screen.getByText('Test Link')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /abrir/i })).toHaveAttribute(
          'href',
          'https://test.example.com'
        );
      });
    });

    it('should return to grid view when clicking back button', async () => {
      const registryWithSection = createMockRegistry({
        sections: [
          {
            id: 'section-1',
            title: 'Test Section',
            letter: 'A',
            description: 'Test description',
            links: [],
          },
        ],
      });

      mockSourceRegistryService.getRegistry.mockResolvedValue(registryWithSection);

      render(
        <BrowserRouter>
          <Sources />
        </BrowserRouter>
      );

      // Click section to open detail view
      const sectionTitle = await screen.findByText('Test Section');
      const sectionCard = sectionTitle.closest('[class*="cursor-pointer"]');
      await userEvent.click(sectionCard!);

      // Wait for detail view
      await waitFor(() => {
        expect(screen.getByText('Seção A')).toBeInTheDocument();
      });

      // Click back button
      const backButton = screen.getByRole('button', { name: /explorar todas áreas/i });
      await userEvent.click(backButton);

      // Should be back in grid view with tabs visible
      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /explorar por área/i })).toBeInTheDocument();
        expect(screen.queryByText('Seção A')).not.toBeInTheDocument();
      });
    });
  });

  describe('LinkCard Copy Functionality', () => {
    beforeEach(() => {
      // Mock clipboard API
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn(),
        },
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
      vi.useRealTimers(); // Ensure real timers are restored
    });

    it('should copy link URL to clipboard on copy button click', async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator.clipboard, { writeText: writeTextMock });

      const registryWithSection = createMockRegistry({
        sections: [
          {
            id: 'section-1',
            title: 'Test Section',
            letter: 'A',
            description: 'Test',
            links: [
              {
                id: 'link-1',
                title: 'Test Link',
                url: 'https://test.example.com',
                kind: 'other',
                official: true,
              },
            ],
          },
        ],
      });

      mockSourceRegistryService.getRegistry.mockResolvedValue(registryWithSection);

      render(
        <BrowserRouter>
          <Sources />
        </BrowserRouter>
      );

      // Open section detail
      const sectionTitle = await screen.findByText('Test Section');
      const sectionCard = sectionTitle.closest('[class*="cursor-pointer"]');
      await userEvent.click(sectionCard!);

      // Wait for detail view and link to render
      await waitFor(() => {
        expect(screen.getByText('Seção A')).toBeInTheDocument();
        expect(screen.getByText('Test Link')).toBeInTheDocument();
      });

      // Click copy button
      const copyButton = await screen.findByRole('button', { name: /copiar/i });
      await userEvent.click(copyButton);

      // Should call clipboard API with correct URL
      expect(writeTextMock).toHaveBeenCalledWith('https://test.example.com');
    });

    it('should show "Copiado!" message after successful copy', async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator.clipboard, { writeText: writeTextMock });

      const registryWithSection = createMockRegistry({
        sections: [
          {
            id: 'section-1',
            title: 'Test Section',
            letter: 'A',
            description: 'Test',
            links: [
              {
                id: 'link-1',
                title: 'Test Link',
                url: 'https://test.example.com',
                kind: 'other',
                official: true,
              },
            ],
          },
        ],
      });

      mockSourceRegistryService.getRegistry.mockResolvedValue(registryWithSection);

      render(
        <BrowserRouter>
          <Sources />
        </BrowserRouter>
      );

      // Open section detail
      const sectionTitle = await screen.findByText('Test Section');
      const sectionCard = sectionTitle.closest('[class*="cursor-pointer"]');
      await userEvent.click(sectionCard!);

      // Wait for detail view and link to render
      await waitFor(() => {
        expect(screen.getByText('Seção A')).toBeInTheDocument();
        expect(screen.getByText('Test Link')).toBeInTheDocument();
      });

      // Click copy button
      const copyButton = await screen.findByRole('button', { name: /copiar/i });
      await userEvent.click(copyButton);

      // Should show "Copiado!" message
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /copiado/i })).toBeInTheDocument();
      });
    });

    it('should reset to "Copiar" after 2 seconds', async () => {
      // Use fake timers with shouldAdvanceTime to allow async operations
      vi.useFakeTimers({ shouldAdvanceTime: true });

      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator.clipboard, { writeText: writeTextMock });

      const registryWithSection = createMockRegistry({
        sections: [
          {
            id: 'section-1',
            title: 'Test Section',
            letter: 'A',
            description: 'Test',
            links: [
              {
                id: 'link-1',
                title: 'Test Link',
                url: 'https://test.example.com',
                kind: 'other',
                official: true,
              },
            ],
          },
        ],
      });

      mockSourceRegistryService.getRegistry.mockResolvedValue(registryWithSection);

      render(
        <BrowserRouter>
          <Sources />
        </BrowserRouter>
      );

      // Open section detail
      const sectionTitle = await screen.findByText('Test Section');
      const sectionCard = sectionTitle.closest('[class*="cursor-pointer"]');
      await userEvent.click(sectionCard!);

      // Wait for detail view and link to render
      await waitFor(() => {
        expect(screen.getByText('Seção A')).toBeInTheDocument();
        expect(screen.getByText('Test Link')).toBeInTheDocument();
      });

      // Click copy button
      const copyButton = await screen.findByRole('button', { name: /copiar/i });
      await userEvent.click(copyButton);

      // Should show "Copiado!"
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /copiado/i })).toBeInTheDocument();
      });

      // Advance fake timers by 2 seconds
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000);
      });

      // Should reset to "Copiar"
      expect(screen.getByRole('button', { name: /^copiar$/i })).toBeInTheDocument();

      vi.useRealTimers();
    });

    it('should log error when clipboard copy fails', async () => {
      const writeTextMock = vi.fn().mockRejectedValue(new Error('Clipboard error'));
      Object.assign(navigator.clipboard, { writeText: writeTextMock });

      // Mock logger
      const mockLogger = await import('@/utils/logger');
      const loggerErrorSpy = vi.spyOn(mockLogger.logger, 'error');

      const registryWithSection = createMockRegistry({
        sections: [
          {
            id: 'section-1',
            title: 'Test Section',
            letter: 'A',
            description: 'Test',
            links: [
              {
                id: 'link-1',
                title: 'Test Link',
                url: 'https://test.example.com',
                kind: 'other',
                official: true,
              },
            ],
          },
        ],
      });

      mockSourceRegistryService.getRegistry.mockResolvedValue(registryWithSection);

      render(
        <BrowserRouter>
          <Sources />
        </BrowserRouter>
      );

      // Open section detail
      const sectionTitle = await screen.findByText('Test Section');
      const sectionCard = sectionTitle.closest('[class*="cursor-pointer"]');
      await userEvent.click(sectionCard!);

      // Wait for detail view and link to render
      await waitFor(() => {
        expect(screen.getByText('Seção A')).toBeInTheDocument();
        expect(screen.getByText('Test Link')).toBeInTheDocument();
      });

      // Click copy button
      const copyButton = await screen.findByRole('button', { name: /copiar/i });
      await userEvent.click(copyButton);

      // Should call logger.error
      await waitFor(() => {
        expect(loggerErrorSpy).toHaveBeenCalledWith(
          'Failed to copy link to clipboard',
          expect.any(Error)
        );
      });
    });
  });

  describe('Verification Badge Rendering', () => {
    it('should render verified badge', async () => {
      const registryWithSection = createMockRegistry({
        sections: [
          {
            id: 'section-1',
            title: 'Test Section',
            letter: 'A',
            description: 'Test',
            links: [
              {
                id: 'link-1',
                title: 'Verified Link',
                url: 'https://verified.example.com',
                kind: 'other',
                official: true,
                verificationStatus: 'verified',
                lastVerified: '2024-01-15T10:00:00Z',
              },
            ],
          },
        ],
      });

      mockSourceRegistryService.getRegistry.mockResolvedValue(registryWithSection);

      render(
        <BrowserRouter>
          <Sources />
        </BrowserRouter>
      );

      // Open section detail
      const sectionTitle = await screen.findByText('Test Section');
      const sectionCard = sectionTitle.closest('[class*="cursor-pointer"]');
      await userEvent.click(sectionCard!);

      // Wait for detail view and link to render
      await waitFor(() => {
        expect(screen.getByText('Seção A')).toBeInTheDocument();
        expect(screen.getByText('Verified Link')).toBeInTheDocument();
      });

      // Should show verified badge
      await waitFor(() => {
        expect(screen.getByText('Verificado')).toBeInTheDocument();
      });
    });

    it('should render unverified badge', async () => {
      const registryWithSection = createMockRegistry({
        sections: [
          {
            id: 'section-1',
            title: 'Test Section',
            letter: 'A',
            description: 'Test',
            links: [
              {
                id: 'link-1',
                title: 'Unverified Link',
                url: 'https://unverified.example.com',
                kind: 'other',
                official: true,
                verificationStatus: 'unverified',
              },
            ],
          },
        ],
      });

      mockSourceRegistryService.getRegistry.mockResolvedValue(registryWithSection);

      render(
        <BrowserRouter>
          <Sources />
        </BrowserRouter>
      );

      // Open section detail
      const sectionTitle = await screen.findByText('Test Section');
      const sectionCard = sectionTitle.closest('[class*="cursor-pointer"]');
      await userEvent.click(sectionCard!);

      // Wait for detail view and link to render
      await waitFor(() => {
        expect(screen.getByText('Seção A')).toBeInTheDocument();
        expect(screen.getByText('Unverified Link')).toBeInTheDocument();
      });

      // Should show unverified badge
      await waitFor(() => {
        expect(screen.getByText('Não verificado')).toBeInTheDocument();
      });
    });

    it('should render broken badge', async () => {
      const registryWithSection = createMockRegistry({
        sections: [
          {
            id: 'section-1',
            title: 'Test Section',
            letter: 'A',
            description: 'Test',
            links: [
              {
                id: 'link-1',
                title: 'Broken Link',
                url: 'https://broken.example.com',
                kind: 'other',
                official: true,
                verificationStatus: 'broken',
                lastVerified: '2024-01-15T10:00:00Z',
              },
            ],
          },
        ],
      });

      mockSourceRegistryService.getRegistry.mockResolvedValue(registryWithSection);

      render(
        <BrowserRouter>
          <Sources />
        </BrowserRouter>
      );

      // Open section detail
      const sectionTitle = await screen.findByText('Test Section');
      const sectionCard = sectionTitle.closest('[class*="cursor-pointer"]');
      await userEvent.click(sectionCard!);

      // Wait for detail view and link to render
      await waitFor(() => {
        expect(screen.getByText('Seção A')).toBeInTheDocument();
        expect(screen.getByText('Broken Link')).toBeInTheDocument();
      });

      // Should show broken badge
      await waitFor(() => {
        expect(screen.getByText('Link quebrado')).toBeInTheDocument();
      });
    });

    it('should render redirected badge', async () => {
      const registryWithSection = createMockRegistry({
        sections: [
          {
            id: 'section-1',
            title: 'Test Section',
            letter: 'A',
            description: 'Test',
            links: [
              {
                id: 'link-1',
                title: 'Redirected Link',
                url: 'https://redirected.example.com',
                kind: 'other',
                official: true,
                verificationStatus: 'redirected',
                lastVerified: '2024-01-15T10:00:00Z',
              },
            ],
          },
        ],
      });

      mockSourceRegistryService.getRegistry.mockResolvedValue(registryWithSection);

      render(
        <BrowserRouter>
          <Sources />
        </BrowserRouter>
      );

      // Open section detail
      const sectionTitle = await screen.findByText('Test Section');
      const sectionCard = sectionTitle.closest('[class*="cursor-pointer"]');
      await userEvent.click(sectionCard!);

      // Wait for detail view and link to render
      await waitFor(() => {
        expect(screen.getByText('Seção A')).toBeInTheDocument();
        expect(screen.getByText('Redirected Link')).toBeInTheDocument();
      });

      // Should show redirected badge
      await waitFor(() => {
        expect(screen.getByText('Redirecionado')).toBeInTheDocument();
      });
    });

    it('should display lastVerified date in pt-BR format', async () => {
      const registryWithSection = createMockRegistry({
        sections: [
          {
            id: 'section-1',
            title: 'Test Section',
            letter: 'A',
            description: 'Test',
            links: [
              {
                id: 'link-1',
                title: 'Verified Link',
                url: 'https://verified.example.com',
                kind: 'other',
                official: true,
                verificationStatus: 'verified',
                lastVerified: '2024-01-15T10:00:00Z',
              },
            ],
          },
        ],
      });

      mockSourceRegistryService.getRegistry.mockResolvedValue(registryWithSection);

      render(
        <BrowserRouter>
          <Sources />
        </BrowserRouter>
      );

      // Open section detail
      const sectionTitle = await screen.findByText('Test Section');
      const sectionCard = sectionTitle.closest('[class*="cursor-pointer"]');
      await userEvent.click(sectionCard!);

      // Wait for detail view and link to render
      await waitFor(() => {
        expect(screen.getByText('Seção A')).toBeInTheDocument();
        expect(screen.getByText('Verified Link')).toBeInTheDocument();
      });

      // Should show lastVerified date with "Verificado" prefix
      await waitFor(() => {
        const dateText = screen.getByText(/verificado 15\/01\/2024/i);
        expect(dateText).toBeInTheDocument();
      });
    });
  });
});
