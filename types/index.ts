export enum EAuthProvider {
  google = 'google',
  local = 'local',
}
export enum ERoomFilmOrder {
  yearDesc = 'year_desc',
  yearAsc = 'year_asc',
  ratingDesc = 'rating_desc',
  ratingAsc = 'rating_asc',
  nameAsc = 'name_asc',
  nameDesc = 'name_desc',
  durationAsc = 'duration_asc',
  durationDesc = 'duration_desc',
  random = 'random',
}
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;

export interface ApiBulkMeta {
  total: number;
  limit: number;
  offset: number;
}
export interface ApiBulkResponse<T> {
  items: T[];
  meta: ApiBulkMeta;
}

export interface SelectOption {
  label: string;
  value: string | number;
}

export interface Pagination {
  limit: number;
  offset: number;
}

export interface SeoFaqItem {
  question: string;
  answer: string;
}

export interface SeoIntentSection {
  eyebrow: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
}

export type SeoIntentAnalyticsSource = 'couple' | 'friends' | 'group';

export interface SeoIntentPage {
  slug: string;
  title: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
  eyebrow: string;
  h1: string;
  lead: string;
  benefits: Array<{ title: string; text: string }>;
  sections: SeoIntentSection[];
  faq: SeoFaqItem[];
  ctaTitle: string;
  ctaText: string;
  analyticsSource: SeoIntentAnalyticsSource;
}
