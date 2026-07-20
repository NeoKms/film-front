export type AdminFilmStatus = 'pending' | 'verified' | 'deleted' | 'active';

export type ModeratedFilm = {
  _id: string;
  verified: boolean;
  deleted: boolean;
};

export type FilmStatusSnapshot = Pick<ModeratedFilm, 'verified' | 'deleted'>;
export type ModerationAction = 'verify' | 'hide' | 'unverify' | 'restore';

export const getAdminFilmStatusQuery = (status: AdminFilmStatus) => {
  if (status === 'pending') return { verified: 'false' };
  if (status === 'verified') return { verified: 'true' };
  if (status === 'deleted') return { deleted: 'true' };
  return {};
};

export const matchesAdminFilmStatus = (
  film: FilmStatusSnapshot,
  status: AdminFilmStatus,
) => {
  if (status === 'pending') return !film.deleted && !film.verified;
  if (status === 'verified') return !film.deleted && film.verified;
  if (status === 'deleted') return film.deleted;
  return !film.deleted;
};

export const appendUniqueFilms = <T extends { _id: string }>(
  current: T[],
  incoming: T[],
) => {
  const ids = new Set(current.map(({ _id }) => _id));
  return [...current, ...incoming.filter(({ _id }) => !ids.has(_id))];
};

export const nextServerOffsetAfterMutation = (
  offset: number,
  before: FilmStatusSnapshot,
  after: FilmStatusSnapshot,
  status: AdminFilmStatus,
) =>
  matchesAdminFilmStatus(before, status) &&
  !matchesAdminFilmStatus(after, status)
    ? Math.max(0, offset - 1)
    : offset;

export const getFilmStatusLabel = (film: FilmStatusSnapshot) => {
  if (film.deleted) return 'Скрыт';
  return film.verified ? 'В пуле' : 'На проверке';
};

export const getNextFilmStatus = (
  film: FilmStatusSnapshot,
  action: ModerationAction,
): FilmStatusSnapshot => {
  if (action === 'verify') return { verified: true, deleted: false };
  if (action === 'unverify') return { verified: false, deleted: false };
  if (action === 'restore') return { verified: film.verified, deleted: false };
  return { verified: film.verified, deleted: true };
};

export const appendModerationHistory = <T>(history: T[], item: T, limit = 20) =>
  [...history, item].slice(-limit);

export const deferFilmForLater = <T extends { _id: string }>(
  active: T[],
  deferred: T[],
  filmId: string,
) => {
  const film = active.find(({ _id }) => _id === filmId);
  if (!film) return { active, deferred };
  return {
    active: active.filter(({ _id }) => _id !== filmId),
    deferred: appendUniqueFilms(deferred, [film]),
  };
};
