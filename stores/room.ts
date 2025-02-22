import type { SelectOption } from '~/types';
import type { IFilmFilter, IFilmItem } from '~/stores/film';

export enum ERoomStatus {
  created,
  started,
  closed,
}
export interface RoomParticipant {
  _id: string;
  name: string;
}

export interface ISettingFilmFilters {
  groups: SelectOption[];
  tags: SelectOption[];
  tagsMode: 'include' | 'exclude';
  countries: SelectOption[];
  countriesMode: 'include' | 'exclude';
  actors: SelectOption[];
  actorsMode: 'include' | 'exclude';
  ratingKp: [number, number];
  ratingImdb: [number, number];
  year: [number, number];
  ageRatings: number[];
  mpaaRatings: string[];
}

export interface RoomResponse {
  _id: string;
  created_at: string;
  film_filter: IFilmFilter;
  code: string;
  status: ERoomStatus;
  participants: RoomParticipant[];
  created_by: RoomParticipant;
  final_film?: Pick<IFilmItem, '_id' | 'name' | 'year' | 'poster_url'>;
}

export const useRoomStore = defineStore('room', () => {
  const wrappedFetch = useWrappedFetch();
  const { track } = useProductAnalytics();
  const lastRoomId = useCookie<string | null>('last-room-id', {
    default: () => null,
    maxAge: 60 * 60 * 24 * 30,
    sameSite: 'lax',
  });

  const openedRoom = ref<RoomResponse | null>(null);
  const filmBatch = ref<IFilmItem[]>([]);
  const matchedFilms = ref<IFilmItem[]>([]);
  const newMatchFilmId = ref<string | null>(null);
  const batchLoading = ref(false);
  const filmBatchRoomId = ref<string | null>(null);
  const matchedFilmsRoomId = ref<string | null>(null);

  const rememberRoom = (room: RoomResponse) => {
    lastRoomId.value = room.status === ERoomStatus.closed ? null : room._id;
  };

  const createRoom = async (): Promise<RoomResponse> => {
    const room = await wrappedFetch<RoomResponse>('/room', { method: 'POST' });
    openedRoom.value = room;
    rememberRoom(room);
    track('room_created');
    return room;
  };
  const openRoom = async (id: string): Promise<RoomResponse> => {
    const room = await wrappedFetch<RoomResponse>(`/room/${id}`);
    if (openedRoom.value?._id && openedRoom.value._id !== room._id) {
      filmBatch.value = [];
      matchedFilms.value = [];
      filmBatchRoomId.value = null;
      matchedFilmsRoomId.value = null;
    }
    openedRoom.value = room;
    rememberRoom(room);
    return room;
  };
  const ensureRoom = async (id: string): Promise<RoomResponse> => {
    if (openedRoom.value?._id === id) return openedRoom.value;
    return openRoom(id);
  };
  const joinByCode = async (code: string): Promise<RoomResponse> => {
    const room = await wrappedFetch<RoomResponse>(`/room/${code}/join`, {
      method: 'PATCH',
    });
    openedRoom.value = room;
    rememberRoom(room);
    return room;
  };
  const updateFilters = async (id: string, filmFilter: IFilmFilter) => {
    openedRoom.value = await wrappedFetch<RoomResponse>(`/room/${id}/filters`, {
      method: 'PUT',
      body: { film_filter: filmFilter },
    });
  };

  const startRoom = async (id: string) => {
    openedRoom.value = await wrappedFetch<RoomResponse>(`/room/${id}/start`, {
      method: 'POST',
    });
    filmBatch.value = [];
    filmBatchRoomId.value = null;
    track('room_started');
  };

  const endRoom = async (id: string) => {
    openedRoom.value = await wrappedFetch<RoomResponse>(`/room/${id}/end`, {
      method: 'POST',
    });
    lastRoomId.value = null;
  };

  const kickParticipant = async (id: string, participantId: string) => {
    openedRoom.value = await wrappedFetch<RoomResponse>(
      `/room/${id}/participants/${participantId}`,
      { method: 'DELETE' },
    );
  };

  const finalizeRoom = async (id: string, filmId: string) => {
    openedRoom.value = await wrappedFetch<RoomResponse>(
      `/room/${id}/finalize`,
      {
        method: 'POST',
        body: { film_id: filmId },
      },
    );
    lastRoomId.value = null;
    track('final_film_selected');
  };

  const repeatRoom = async (id: string): Promise<RoomResponse> => {
    const room = await wrappedFetch<RoomResponse>(`/room/${id}/repeat`, {
      method: 'POST',
    });
    openedRoom.value = room;
    filmBatch.value = [];
    matchedFilms.value = [];
    filmBatchRoomId.value = null;
    matchedFilmsRoomId.value = null;
    rememberRoom(room);
    track('room_repeated');
    return room;
  };

  const openLastRoom = async (): Promise<RoomResponse | null> => {
    if (!lastRoomId.value) return null;
    try {
      const room = await openRoom(lastRoomId.value);
      if (room.status === ERoomStatus.closed) {
        lastRoomId.value = null;
        return null;
      }
      return room;
    } catch {
      lastRoomId.value = null;
      return null;
    }
  };

  const loadFilmBatch = async (id: string): Promise<IFilmItem[]> => {
    if (batchLoading.value) return filmBatch.value;
    batchLoading.value = true;
    try {
      filmBatch.value = await wrappedFetch<IFilmItem[]>(`/room/${id}/films`);
      filmBatchRoomId.value = id;
      return filmBatch.value;
    } finally {
      batchLoading.value = false;
    }
  };
  const ensureFilmBatch = async (id: string): Promise<IFilmItem[]> => {
    if (filmBatchRoomId.value === id) return filmBatch.value;
    return loadFilmBatch(id);
  };

  const decide = async (
    roomId: string,
    filmId: string,
    direction: 'select' | 'deselect',
  ): Promise<void> => {
    await wrappedFetch(`/room/${roomId}/films/${filmId}/${direction}`, {
      method: 'POST',
    });
  };

  const loadMatchedFilms = async (id: string): Promise<IFilmItem[]> => {
    matchedFilms.value = await wrappedFetch<IFilmItem[]>(
      `/room/${id}/films/matched`,
    );
    matchedFilmsRoomId.value = id;
    return matchedFilms.value;
  };
  const ensureMatchedFilms = async (id: string): Promise<IFilmItem[]> => {
    if (matchedFilmsRoomId.value === id) return matchedFilms.value;
    return loadMatchedFilms(id);
  };

  const applyRoomUpdate = (room: RoomResponse) => {
    if (!openedRoom.value || openedRoom.value._id === room._id) {
      openedRoom.value = room;
      rememberRoom(room);
    }
  };

  const announceMatch = (filmId: string) => {
    newMatchFilmId.value = filmId;
  };

  const reset = () => {
    openedRoom.value = null;
    filmBatch.value = [];
    matchedFilms.value = [];
    newMatchFilmId.value = null;
    filmBatchRoomId.value = null;
    matchedFilmsRoomId.value = null;
  };

  return {
    openedRoom,
    lastRoomId,
    filmBatch,
    matchedFilms,
    newMatchFilmId,
    batchLoading,
    createRoom,
    openRoom,
    ensureRoom,
    joinByCode,
    updateFilters,
    startRoom,
    endRoom,
    kickParticipant,
    finalizeRoom,
    repeatRoom,
    openLastRoom,
    loadFilmBatch,
    ensureFilmBatch,
    decide,
    loadMatchedFilms,
    ensureMatchedFilms,
    applyRoomUpdate,
    announceMatch,
    reset,
  };
});
