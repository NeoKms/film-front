import type { EAuthProvider, Nullable } from '~/types';
import type { IFilmItem } from '~/stores/film';
import type { RoomParticipant } from '~/stores/room';

interface UserProfile {
  _id: string;
  roles: string[];
  name: string;
  login?: string;
  token_id?: string;
  auth_provider?: EAuthProvider;
}

export interface ChangePasswordData {
  current_password: string;
  new_password: string;
}
export interface UserRoomHistoryItem {
  _id: string;
  code: string;
  status: ERoomStatus;
  created_at: string;
  updated_at: string;
  participants: RoomParticipant[];
  created_by: RoomParticipant;
  matched_films: IFilmItem[];
  final_film?: Pick<IFilmItem, '_id' | 'name' | 'year' | 'poster_url'>;
}
export const useUserStore = defineStore('user', () => {
  const wrappedFetch = useWrappedFetch();

  const profile = ref<Nullable<UserProfile>>(null);

  async function getProfile(): Promise<void> {
    profile.value = await wrappedFetch<UserProfile>('/auth/profile', {
      method: 'GET',
    });
  }

  async function updateProfile(
    data: Partial<Pick<UserProfile, 'name'>>,
  ): Promise<void> {
    if (!profile.value) throw new Error();
    const response = await wrappedFetch<UserProfile>(`/user/profile`, {
      method: 'PATCH',
      body: data,
    });
    profile.value = Object.assign(profile.value ?? {}, response);
  }

  async function getRoomHistory(): Promise<UserRoomHistoryItem[]> {
    const response = await wrappedFetch<{
      items: UserRoomHistoryItem[];
    }>('/user/rooms');
    return response.items;
  }

  async function changePassword(data: ChangePasswordData): Promise<void> {
    await wrappedFetch('/user/password', {
      method: 'PATCH',
      body: data,
      skipAuthRefresh: true,
    });
  }

  function clearProfile(): void {
    profile.value = null;
  }

  return {
    profile,
    getProfile,
    updateProfile,
    getRoomHistory,
    changePassword,
    clearProfile,
  };
});
