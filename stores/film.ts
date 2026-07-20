import type { ERoomFilmOrder } from '~/types';

export interface IFilmFilter {
  order?: ERoomFilmOrder;
  search?: string;
  ids?: string[];
  group_id?: string;
  groups?: string[];
  actors?: string[];
  tags?: string[];
  countries?: string[];
  exclude_actors?: string[];
  exclude_tags?: string[];
  exclude_countries?: string[];
  rating_from?: number;
  rating_to?: number;
  year_from?: number;
  year_to?: number;
  age_ratings?: number[];
  mpaa_ratings?: string[];
}

export enum EMPAARating {
  g = 'G',
  pg = 'PG',
  pg13 = 'PG13',
  r = 'R',
  nc17 = 'NC17',
}

export interface FilmItemPerson {
  name: string;
  position: EPersonPosition;
  photo_url: string | null;
  billing_order: number;
}

export interface IFilmItem {
  _id: string;
  name: string;
  description: string | null;
  rating: number;
  duration: number;
  rating_age: number | null;
  rating_mpaa: EMPAARating | null;
  year: number;
  poster_url: string | null;
  cover_url: string | null;
  trailer_url: string | null;
  country_names: string[];
  tag_names: string[];
  person_items: FilmItemPerson[];
}

export const useFilmStore = defineStore('film', () => {
  const wrappedFetch = useWrappedFetch();

  const getById = async (id: string): Promise<IFilmItem | null> => {
    const response = await wrappedFetch<{ items: IFilmItem[] }>(
      `/film?ids=${encodeURIComponent(id)}&limit=1&offset=0`,
    );
    return response.items[0] ?? null;
  };

  const getOneFastFilter = async (filter: IFilmFilter): Promise<number> => {
    const key = Date.now();
    const response = await wrappedFetch<Record<string, number>>(
      `/film/fast-filter-total`,
      {
        method: 'POST',
        body: {
          [key]: filter,
        },
      },
    );
    return response[key] ?? 0;
  };

  return { getById, getOneFastFilter };
});
