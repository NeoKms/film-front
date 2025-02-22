export enum EAuthProvider {
  google = 'google',
  local = 'local',
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
