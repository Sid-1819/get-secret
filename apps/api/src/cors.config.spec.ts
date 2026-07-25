import {
  createCorsOriginCallback,
  parseCorsOrigins,
} from './cors.config';

describe('parseCorsOrigins', () => {
  it('returns * when unset or empty', () => {
    expect(parseCorsOrigins(undefined)).toBe('*');
    expect(parseCorsOrigins('')).toBe('*');
    expect(parseCorsOrigins('   ')).toBe('*');
  });

  it('returns * for explicit wildcard', () => {
    expect(parseCorsOrigins('*')).toBe('*');
    expect(parseCorsOrigins('*,http://localhost:8080')).toBe('*');
  });

  it('parses comma-separated origins', () => {
    expect(
      parseCorsOrigins('https://a.example, https://b.example'),
    ).toEqual(['https://a.example', 'https://b.example']);
  });
});

describe('createCorsOriginCallback', () => {
  it('allows any origin when config is *', () => {
    const cb = createCorsOriginCallback('*');
    const done = jest.fn();
    cb('https://third-party.example', done);
    expect(done).toHaveBeenCalledWith(null, true);
  });

  it('allows missing origin for non-browser clients', () => {
    const cb = createCorsOriginCallback(['https://a.example']);
    const done = jest.fn();
    cb(undefined, done);
    expect(done).toHaveBeenCalledWith(null, true);
  });

  it('rejects origins not on the allowlist', () => {
    const cb = createCorsOriginCallback(['https://a.example']);
    const done = jest.fn();
    cb('https://other.example', done);
    expect(done.mock.calls[0][0]).toBeInstanceOf(Error);
  });
});
