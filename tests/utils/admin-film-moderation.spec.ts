import { describe, expect, test } from 'vitest';
import {
  appendModerationHistory,
  appendUniqueFilms,
  deferFilmForLater,
  getAdminFilmStatusQuery,
  getNextFilmStatus,
  matchesAdminFilmStatus,
  nextServerOffsetAfterMutation,
} from '../../utils/admin-film-moderation';

describe('admin film status filters', () => {
  test.each([
    ['pending', { verified: 'false' }],
    ['verified', { verified: 'true' }],
    ['deleted', { deleted: 'true' }],
    ['active', {}],
  ] as const)('maps %s to API query', (status, query) => {
    expect(getAdminFilmStatusQuery(status)).toEqual(query);
  });

  test('covers the full moderation lifecycle', () => {
    expect(
      matchesAdminFilmStatus({ verified: false, deleted: false }, 'pending'),
    ).toBe(true);
    expect(
      matchesAdminFilmStatus({ verified: true, deleted: false }, 'verified'),
    ).toBe(true);
    expect(
      matchesAdminFilmStatus({ verified: true, deleted: true }, 'deleted'),
    ).toBe(true);
    expect(
      matchesAdminFilmStatus({ verified: false, deleted: false }, 'active'),
    ).toBe(true);
  });
});

describe('admin moderation actions and undo history', () => {
  test('maps every action to the expected status', () => {
    expect(
      getNextFilmStatus({ verified: false, deleted: false }, 'verify'),
    ).toEqual({ verified: true, deleted: false });
    expect(
      getNextFilmStatus({ verified: true, deleted: false }, 'unverify'),
    ).toEqual({ verified: false, deleted: false });
    expect(
      getNextFilmStatus({ verified: true, deleted: false }, 'hide'),
    ).toEqual({ verified: true, deleted: true });
    expect(
      getNextFilmStatus({ verified: true, deleted: true }, 'restore'),
    ).toEqual({ verified: true, deleted: false });
  });

  test('keeps only the newest undo actions', () => {
    expect(appendModerationHistory([1, 2], 3, 2)).toEqual([2, 3]);
  });

  test('defers a skipped film without duplicating it', () => {
    const film1 = { _id: '1' };
    const film2 = { _id: '2' };
    const result = deferFilmForLater([film1, film2], [film1], '1');

    expect(result.active).toEqual([film2]);
    expect(result.deferred).toEqual([film1]);
  });
});

describe('admin infinite moderation queue', () => {
  test('appends films without duplicate ids', () => {
    expect(
      appendUniqueFilms(
        [{ _id: '1' }, { _id: '2' }],
        [{ _id: '2' }, { _id: '3' }],
      ),
    ).toEqual([{ _id: '1' }, { _id: '2' }, { _id: '3' }]);
  });

  test('decrements offset when mutation removes a server-side match', () => {
    expect(
      nextServerOffsetAfterMutation(
        40,
        { verified: false, deleted: false },
        { verified: true, deleted: false },
        'pending',
      ),
    ).toBe(39);
  });

  test('keeps offset when item still matches the server-side filter', () => {
    expect(
      nextServerOffsetAfterMutation(
        40,
        { verified: false, deleted: false },
        { verified: true, deleted: false },
        'active',
      ),
    ).toBe(40);
  });
});
