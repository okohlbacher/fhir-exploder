import { describe, it } from 'vitest';

describe('classifyError', () => {
  it.todo('classifies TypeError with fetch as network error');
  it.todo('classifies HTTP 401 as auth error');
  it.todo('classifies HTTP 403 as auth error');
  it.todo('classifies HTTP 500 as invalid_response error');
  it.todo('classifies unknown errors as unknown type');
  it.todo('includes serverUrl in error messages');
  it.todo('includes authMode in auth error messages');
  it.todo('includes actionable suggestion in every error');
});
