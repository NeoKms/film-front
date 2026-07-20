import { describe, expect, it, vi } from 'vitest';
import {
  loadAllAdminReferences,
  resolveAdminReferenceNames,
} from '../../utils/admin-references';

describe('admin references', () => {
  it('loads references beyond the first 100 items', async () => {
    const references = Array.from({ length: 101 }, (_, index) => ({
      _id: `country-${index + 1}`,
      name: index === 100 ? 'США' : `Страна ${index + 1}`,
      verified: true,
    }));
    const fetchPage = vi.fn(async ({ limit, offset }) => ({
      items: references.slice(offset, offset + limit),
      meta: { total: references.length },
    }));

    const result = await loadAllAdminReferences(fetchPage);

    expect(fetchPage).toHaveBeenCalledTimes(2);
    expect(fetchPage).toHaveBeenNthCalledWith(1, { limit: 100, offset: 0 });
    expect(fetchPage).toHaveBeenNthCalledWith(2, { limit: 100, offset: 100 });
    expect(result).toHaveLength(101);
    expect(result.at(-1)?.name).toBe('США');
  });

  it('loads every page for larger genre and group dictionaries', async () => {
    const references = Array.from({ length: 201 }, (_, index) => index);
    const fetchPage = vi.fn(async ({ limit, offset }) => ({
      items: references.slice(offset, offset + limit),
      meta: { total: references.length },
    }));

    await expect(loadAllAdminReferences(fetchPage)).resolves.toEqual(
      references,
    );
    expect(fetchPage).toHaveBeenLastCalledWith({ limit: 100, offset: 200 });
  });

  it('does not cache references between reloads', async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({ items: ['Россия'], meta: { total: 1 } })
      .mockResolvedValueOnce({
        items: ['Россия', 'США'],
        meta: { total: 2 },
      });

    await expect(loadAllAdminReferences(fetchPage)).resolves.toEqual([
      'Россия',
    ]);
    await expect(loadAllAdminReferences(fetchPage)).resolves.toEqual([
      'Россия',
      'США',
    ]);
  });

  it('uses a readable fallback without exposing an ObjectId', () => {
    const objectId = '6a5e752e5581d1225f86ceb0';

    expect(
      resolveAdminReferenceNames(
        ['known-country', objectId],
        [{ _id: 'known-country', name: 'Россия', verified: true }],
        'Неизвестная страна',
      ),
    ).toEqual(['Россия', 'Неизвестная страна']);
  });
});
