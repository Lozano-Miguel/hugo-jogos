import { describe, expect, it } from 'vitest';
import { T } from '../src/strings';

describe('strings', () => {
  it('has no empty text', () => {
    for (const value of Object.values(T)) expect(value.trim()).not.toBe('');
  });

  it('says it is unofficial', () => {
    expect(T.disclaimer).toContain('não oficial');
  });
});
