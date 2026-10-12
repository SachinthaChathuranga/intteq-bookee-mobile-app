import { describe, expect, it } from 'vitest';
import { normalizePhone } from '../src/utils/phone.js';

describe('normalizePhone', () => {
  it.each([
    ['0771234567', '94771234567'],
    ['+94771234567', '94771234567'],
    ['94771234567', '94771234567'],
    ['771234567', '94771234567'],
    ['077 123 4567', '94771234567'],
    ['+94 77-123-4567', '94771234567'],
  ])('normalises %s', (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it.each(['', '12345', '0112345678', '+9477123', 'abc', '07712345678'])('rejects %s', (input) => {
    expect(normalizePhone(input)).toBeNull();
  });
});
