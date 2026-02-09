import { describe, it, expect, vi, beforeEach } from 'vitest'

// Use vi.hoisted to define mocks that need to be available before module import
const { mockGet, mockPost, mockPut, mockDelete } = vi.hoisted(() => {
  return {
    mockGet: vi.fn(),
    mockPost: vi.fn(),
    mockPut: vi.fn(),
    mockDelete: vi.fn(),
  }
})

vi.mock('axios', () => {
  const mockAxiosInstance = {
    create: vi.fn(() => mockAxiosInstance),
    get: mockGet,
    post: mockPost,
    put: mockPut,
    delete: mockDelete,
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  }
  return { default: mockAxiosInstance }
})

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
        error: null,
      }),
    },
  },
}))

describe('Privacy API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGet.mockReset()
    mockPost.mockReset()
    mockPut.mockReset()
    mockDelete.mockReset()
  })

  // ============================================
  // CONSENTS API TESTS
  // ============================================
  describe('Consents', () => {
    it('should get user consents', async () => {
      const mockConsents = [
        { id: 'c1', consent_type: 'terms', consented: true },
        { id: 'c2', consent_type: 'privacy', consented: true },
      ]
      mockGet.mockResolvedValueOnce({ data: mockConsents })

      const { PrivacyAPI } = await import('./client.js')
      const result = await PrivacyAPI.getConsents()

      expect(result).toEqual(mockConsents)
      expect(mockGet).toHaveBeenCalledWith('/privacy/consents')
    })

    it('should update consent', async () => {
      const mockConsent = { id: 'c1', consent_type: 'marketing', consented: true }
      mockPost.mockResolvedValueOnce({ data: mockConsent })

      const { PrivacyAPI } = await import('./client.js')
      const result = await PrivacyAPI.updateConsent({
        consent_type: 'marketing',
        consented: true,
        consent_version: '1.0'
      })

      expect(result.consented).toBe(true)
      expect(mockPost).toHaveBeenCalledWith('/privacy/consents', {
        consent_type: 'marketing',
        consented: true,
        consent_version: '1.0'
      })
    })
  })

  // ============================================
  // PRIVACY SETTINGS TESTS
  // ============================================
  describe('Privacy Settings', () => {
    it('should get privacy settings', async () => {
      const mockSettings = {
        marketing_emails_enabled: false,
        push_notifications_enabled: true,
        data_analytics_enabled: true,
        two_factor_enabled: false,
      }
      mockGet.mockResolvedValueOnce({ data: mockSettings })

      const { PrivacyAPI } = await import('./client.js')
      const result = await PrivacyAPI.getSettings()

      expect(result.push_notifications_enabled).toBe(true)
      expect(mockGet).toHaveBeenCalledWith('/privacy/settings')
    })

    it('should update privacy settings', async () => {
      const mockSettings = { marketing_emails_enabled: true }
      mockPut.mockResolvedValueOnce({ data: mockSettings })

      const { PrivacyAPI } = await import('./client.js')
      const result = await PrivacyAPI.updateSettings({ marketing_emails_enabled: true })

      expect(result.marketing_emails_enabled).toBe(true)
      expect(mockPut).toHaveBeenCalledWith('/privacy/settings', { marketing_emails_enabled: true })
    })
  })

  // ============================================
  // SESSIONS TESTS
  // ============================================
  describe('Sessions', () => {
    it('should get active sessions', async () => {
      const mockSessions = [
        { id: 's1', device_info: { browser: 'Chrome' }, is_current: true },
        { id: 's2', device_info: { browser: 'Firefox' }, is_current: false },
      ]
      mockGet.mockResolvedValueOnce({ data: mockSessions })

      const { PrivacyAPI } = await import('./client.js')
      const result = await PrivacyAPI.getSessions()

      expect(result).toHaveLength(2)
      expect(result[0].is_current).toBe(true)
      expect(mockGet).toHaveBeenCalledWith('/privacy/sessions')
    })

    it('should revoke a session', async () => {
      mockDelete.mockResolvedValueOnce({ data: null })

      const { PrivacyAPI } = await import('./client.js')
      await PrivacyAPI.revokeSession('session-123')

      expect(mockDelete).toHaveBeenCalledWith('/privacy/sessions/session-123')
    })

    it('should revoke all sessions', async () => {
      mockDelete.mockResolvedValueOnce({ data: null })

      const { PrivacyAPI } = await import('./client.js')
      await PrivacyAPI.revokeAllSessions()

      expect(mockDelete).toHaveBeenCalledWith('/privacy/sessions')
    })
  })

  // ============================================
  // DATA EXPORT TESTS
  // ============================================
  describe('Data Export', () => {
    it('should request data export', async () => {
      const mockRequest = { id: 'export-1', status: 'pending' }
      mockPost.mockResolvedValueOnce({ data: mockRequest })

      const { PrivacyAPI } = await import('./client.js')
      const result = await PrivacyAPI.requestDataExport()

      expect(result.status).toBe('pending')
      expect(mockPost).toHaveBeenCalledWith('/privacy/data-export')
    })

    it('should get data export requests', async () => {
      const mockRequests = [
        { id: 'export-1', status: 'completed', download_url: 'https://...' },
      ]
      mockGet.mockResolvedValueOnce({ data: mockRequests })

      const { PrivacyAPI } = await import('./client.js')
      const result = await PrivacyAPI.getDataExportRequests()

      expect(result).toHaveLength(1)
      expect(result[0].status).toBe('completed')
      expect(mockGet).toHaveBeenCalledWith('/privacy/data-export')
    })
  })

  // ============================================
  // ACCOUNT DELETION TESTS
  // ============================================
  describe('Account Deletion', () => {
    it('should request account deletion', async () => {
      const mockRequest = {
        id: 'del-1',
        status: 'pending',
        scheduled_deletion_at: '2026-03-11T00:00:00Z',
      }
      mockPost.mockResolvedValueOnce({ data: mockRequest })

      const { PrivacyAPI } = await import('./client.js')
      const result = await PrivacyAPI.requestAccountDeletion({
        reason: 'Moving to another platform',
        confirm_password: 'password123'
      })

      expect(result.status).toBe('pending')
      expect(mockPost).toHaveBeenCalledWith('/privacy/delete-account', {
        reason: 'Moving to another platform',
        confirm_password: 'password123'
      })
    })

    it('should cancel account deletion', async () => {
      mockDelete.mockResolvedValueOnce({ data: null })

      const { PrivacyAPI } = await import('./client.js')
      await PrivacyAPI.cancelAccountDeletion('del-1')

      expect(mockDelete).toHaveBeenCalledWith('/privacy/delete-account/del-1')
    })
  })

  // ============================================
  // COOKIE PREFERENCES TESTS
  // ============================================
  describe('Cookie Preferences', () => {
    it('should get cookie preferences', async () => {
      const mockPrefs = {
        essential: true,
        analytics: true,
        marketing: false,
        functional: true,
      }
      mockGet.mockResolvedValueOnce({ data: mockPrefs })

      const { PrivacyAPI } = await import('./client.js')
      const result = await PrivacyAPI.getCookiePreferences()

      expect(result.essential).toBe(true)
      expect(result.analytics).toBe(true)
      expect(mockGet).toHaveBeenCalledWith('/privacy/cookies')
    })

    it('should save cookie preferences', async () => {
      const mockPrefs = {
        essential: true,
        analytics: true,
        marketing: false,
        functional: true,
      }
      mockPost.mockResolvedValueOnce({ data: mockPrefs })

      const { PrivacyAPI } = await import('./client.js')
      const result = await PrivacyAPI.saveCookiePreferences(mockPrefs)

      expect(result.analytics).toBe(true)
      expect(mockPost).toHaveBeenCalledWith('/privacy/cookies', mockPrefs)
    })
  })

  // ============================================
  // LEGAL API TESTS
  // ============================================
  describe('Legal Documents', () => {
    it('should get terms of service', async () => {
      const mockTerms = { version: '1.0', effective_date: '2026-01-01' }
      mockGet.mockResolvedValueOnce({ data: mockTerms })

      const { LegalAPI } = await import('./client.js')
      const result = await LegalAPI.getTerms()

      expect(result.version).toBe('1.0')
      expect(mockGet).toHaveBeenCalledWith('/legal/terms')
    })

    it('should get privacy policy', async () => {
      const mockPolicy = { version: '1.0', effective_date: '2026-01-01' }
      mockGet.mockResolvedValueOnce({ data: mockPolicy })

      const { LegalAPI } = await import('./client.js')
      const result = await LegalAPI.getPrivacyPolicy()

      expect(result.version).toBe('1.0')
      expect(mockGet).toHaveBeenCalledWith('/legal/privacy')
    })
  })
})
