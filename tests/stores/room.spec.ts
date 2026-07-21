import { afterEach, describe, expect, test, vi } from 'vitest';

const setupStore = async () => {
  vi.resetModules();
  const wrappedFetch = vi.fn();
  const track = vi.fn();
  const lastRoomId = { value: null as string | null };
  vi.stubGlobal(
    'defineStore',
    (_id: string, factory: () => unknown) => factory,
  );
  vi.stubGlobal('ref', <T>(value: T) => ({ value }));
  vi.stubGlobal('useWrappedFetch', () => wrappedFetch);
  vi.stubGlobal('useProductAnalytics', () => ({ track }));
  vi.stubGlobal('useCookie', () => lastRoomId);
  const roomModule = await import('../../stores/room');
  return {
    store: roomModule.useRoomStore() as ReturnType<
      typeof roomModule.useRoomStore
    >,
    ERoomStatus: roomModule.ERoomStatus,
    wrappedFetch,
    track,
    lastRoomId,
  };
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('room store', () => {
  test('creates and remembers active room', async () => {
    const { store, ERoomStatus, wrappedFetch, track, lastRoomId } =
      await setupStore();
    const room = { _id: 'room-1', status: ERoomStatus.created };
    wrappedFetch.mockResolvedValue(room);

    await expect(store.createRoom()).resolves.toBe(room);
    expect(wrappedFetch).toHaveBeenCalledWith('/room', { method: 'POST' });
    expect((store.openedRoom as unknown as { value: unknown }).value).toBe(
      room,
    );
    expect(lastRoomId.value).toBe('room-1');
    expect(track).toHaveBeenCalledWith('room_created');
  });

  test('uses cached room and film batch for the same room', async () => {
    const { store, ERoomStatus, wrappedFetch } = await setupStore();
    const room = { _id: 'room-1', status: ERoomStatus.started };
    const films = [{ _id: 'film-1' }];
    wrappedFetch.mockResolvedValueOnce(room).mockResolvedValueOnce(films);

    await store.openRoom('room-1');
    await expect(store.ensureRoom('room-1')).resolves.toBe(room);
    await expect(store.ensureFilmBatch('room-1')).resolves.toBe(films);
    await expect(store.ensureFilmBatch('room-1')).resolves.toBe(films);

    expect(wrappedFetch).toHaveBeenCalledTimes(2);
    expect(wrappedFetch).toHaveBeenNthCalledWith(1, '/room/room-1');
    expect(wrappedFetch).toHaveBeenNthCalledWith(2, '/room/room-1/films');
  });

  test('clears room-scoped caches when another room opens', async () => {
    const { store, ERoomStatus, wrappedFetch } = await setupStore();
    const firstRoom = { _id: 'room-1', status: ERoomStatus.started };
    const secondRoom = { _id: 'room-2', status: ERoomStatus.created };
    wrappedFetch
      .mockResolvedValueOnce(firstRoom)
      .mockResolvedValueOnce([{ _id: 'film-1' }])
      .mockResolvedValueOnce([{ _id: 'match-1' }])
      .mockResolvedValueOnce(secondRoom);

    await store.openRoom('room-1');
    await store.loadFilmBatch('room-1');
    await store.loadMatchedFilms('room-1');
    await store.openRoom('room-2');

    expect((store.filmBatch as unknown as { value: unknown }).value).toEqual(
      [],
    );
    expect((store.matchedFilms as unknown as { value: unknown }).value).toEqual(
      [],
    );
  });

  test('sends start, decision, undo and finalize commands with exact contract', async () => {
    const { store, ERoomStatus, wrappedFetch, track, lastRoomId } =
      await setupStore();
    const startedRoom = { _id: 'room-1', status: ERoomStatus.started };
    const closedRoom = { _id: 'room-1', status: ERoomStatus.closed };
    wrappedFetch
      .mockResolvedValueOnce(startedRoom)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(closedRoom);

    await store.startRoom('room-1');
    await store.decide('room-1', 'film-1', 'select');
    await store.undoDecision('room-1', 'film-1');
    await store.finalizeRoom('room-1', 'film-1');

    expect(wrappedFetch).toHaveBeenNthCalledWith(1, '/room/room-1/start', {
      method: 'POST',
    });
    expect(wrappedFetch).toHaveBeenNthCalledWith(
      2,
      '/room/room-1/films/film-1/select',
      { method: 'POST' },
    );
    expect(wrappedFetch).toHaveBeenNthCalledWith(
      3,
      '/room/room-1/films/film-1/decision',
      { method: 'DELETE' },
    );
    expect(wrappedFetch).toHaveBeenNthCalledWith(4, '/room/room-1/finalize', {
      method: 'POST',
      body: { film_id: 'film-1' },
    });
    expect(lastRoomId.value).toBeNull();
    expect(track).toHaveBeenCalledWith('room_started');
    expect(track).toHaveBeenCalledWith('final_film_selected');
  });

  test('drops an invalid last room instead of leaving stale return state', async () => {
    const { store, wrappedFetch, lastRoomId } = await setupStore();
    lastRoomId.value = 'missing-room';
    wrappedFetch.mockRejectedValue(new Error('not found'));

    await expect(store.openLastRoom()).resolves.toBeNull();
    expect(lastRoomId.value).toBeNull();
  });
});
