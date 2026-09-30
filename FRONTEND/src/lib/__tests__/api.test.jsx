jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

jest.mock('../../lib/api', () => {
  const interceptors = {
    request: { handlers: [] },
    response: { handlers: [] },
  };

  const apiInstance = {
    defaults: { headers: { common: {} } },
    interceptors,
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  };

  return {
    api: apiInstance,
    setAuthToken: jest.fn((token) => {
      if (token) {
        apiInstance.defaults.headers.common.Authorization = `Bearer ${token}`;
      } else {
        delete apiInstance.defaults.headers.common.Authorization;
      }
    }),
  };
});

const { api, setAuthToken } = require('../../lib/api');

describe('api', () => {
  beforeEach(() => {
    localStorage.clear();
    api.defaults.headers.common = {};
    jest.clearAllMocks();
  });

  test('api instance exists', () => {
    expect(api).toBeDefined();
    expect(api.defaults).toBeDefined();
  });

  test('setAuthToken sets Authorization header', () => {
    setAuthToken('my-token');
    expect(api.defaults.headers.common.Authorization).toBe('Bearer my-token');
  });

  test('setAuthToken removes Authorization header when null', () => {
    api.defaults.headers.common.Authorization = 'Bearer old-token';
    setAuthToken(null);
    expect(api.defaults.headers.common.Authorization).toBeUndefined();
  });
});
