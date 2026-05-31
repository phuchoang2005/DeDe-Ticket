import { generateUuid } from '../src/storage/deviceId';

describe('generateUuid', () => {
  test('returns an RFC4122 v4-shaped uuid', () => {
    const id = generateUuid();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  test('produces distinct values', () => {
    expect(generateUuid()).not.toBe(generateUuid());
  });
});
