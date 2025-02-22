import { sendRedirect } from 'h3';
import type { EventHandlerRequest, H3Event } from 'h3';

export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const isMissingImageUrl = (src?: string | null): boolean =>
  !src || /no[-_]?poster\.(?:gif|jpe?g|png|webp)(?:\?.*)?$/i.test(src);

export const isRedirectedKinopoiskPlaceholder = (
  image: HTMLImageElement,
): boolean =>
  /(?:^|\.)yandex\.(?:net|ru)$/i.test(new URL(image.currentSrc).hostname) &&
  image.naturalWidth === 208 &&
  image.naturalHeight === 304;

export const multiNavigate = async (
  to: string,
  event?: H3Event<EventHandlerRequest>,
  from_component: boolean = false,
) => {
  if (import.meta.client || from_component) {
    return navigateTo(to);
  } else if (event) {
    return sendRedirect(event, to);
  } else {
    throw new Error('oops cant redirect');
  }
};

type QueryValue =
  string | number | boolean | string[] | number[] | null | undefined;

export const toQueryParams = (params: object): string => {
  return Object.entries(params as Record<string, QueryValue>)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        return value
          .map((v) => `${encodeURIComponent(key)}=${encodeURIComponent(v)}`)
          .join('&');
      }
      return `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`;
    })
    .join('&');
};

export const mapSettingsToFilmFilter = (
  filter: ISettingFilmFilters,
): IFilmFilter => {
  if (filter.groups.length) {
    return {
      groups: filter.groups.map((el) => el.value.toString()),
    };
  }
  const nowYear = new Date().getFullYear();
  return {
    actors:
      filter.actors.length && filter.actorsMode === 'include'
        ? filter.actors.map((el) => el.value.toString())
        : undefined,
    exclude_actors:
      filter.actors.length && filter.actorsMode === 'exclude'
        ? filter.actors.map((el) => el.value.toString())
        : undefined,
    tags:
      filter.tags.length && filter.tagsMode === 'include'
        ? filter.tags.map((el) => el.value.toString())
        : undefined,
    exclude_tags:
      filter.tags.length && filter.tagsMode === 'exclude'
        ? filter.tags.map((el) => el.value.toString())
        : undefined,
    countries:
      filter.countries.length && filter.countriesMode === 'include'
        ? filter.countries.map((el) => el.value.toString())
        : undefined,
    exclude_countries:
      filter.countries.length && filter.countriesMode === 'exclude'
        ? filter.countries.map((el) => el.value.toString())
        : undefined,
    rating_kp_from: filter.ratingKp[0] === 1 ? undefined : +filter.ratingKp[0],
    rating_kp_to: filter.ratingKp[1] === 10 ? undefined : +filter.ratingKp[1],
    rating_imdb_from:
      filter.ratingImdb[0] === 1 ? undefined : +filter.ratingImdb[0],
    rating_imdb_to:
      filter.ratingImdb[1] === 10 ? undefined : +filter.ratingImdb[1],
    year_from: filter.year[0] === 1960 ? undefined : +filter.year[0],
    year_to: filter.year[1] === nowYear ? undefined : +filter.year[1],
    age_ratings: filter.ageRatings.length
      ? Array.from(filter.ageRatings)
      : undefined,
    mpaa_ratings: filter.mpaaRatings.length
      ? Array.from(filter.mpaaRatings)
      : undefined,
  };
};
