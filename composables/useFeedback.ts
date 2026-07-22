import type { CreateFeedbackPayload, FeedbackCreatedResponse } from '~/types';

const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;
const ROOM_FEEDBACK_STORAGE_PREFIX = 'film-together:room-feedback:';

export const buildFeedbackContext = (
  path: string,
  userAgent?: string,
  roomId?: string,
): Pick<CreateFeedbackPayload, 'page_path' | 'user_agent' | 'room_id'> => ({
  page_path: path.split(/[?#]/, 1)[0]?.slice(0, 500) || '/',
  ...(userAgent ? { user_agent: userAgent.slice(0, 500) } : {}),
  ...(roomId && OBJECT_ID_PATTERN.test(roomId) ? { room_id: roomId } : {}),
});

export const roomFeedbackStorageKey = (roomId: string) =>
  `${ROOM_FEEDBACK_STORAGE_PREFIX}${roomId}`;

type FeedbackStorage = Pick<Storage, 'getItem' | 'setItem'>;

export const hasSubmittedRoomFeedback = (
  storage: FeedbackStorage,
  roomId: string,
) => storage.getItem(roomFeedbackStorageKey(roomId)) === 'sent';

export const markRoomFeedbackSubmitted = (
  storage: FeedbackStorage,
  roomId: string,
) => storage.setItem(roomFeedbackStorageKey(roomId), 'sent');

export const useFeedback = () => {
  const wrappedFetch = useWrappedFetch();
  const route = useRoute();

  const context = (roomId?: string) =>
    buildFeedbackContext(
      route.path,
      import.meta.client ? navigator.userAgent : undefined,
      roomId,
    );

  const submitFeedback = (
    payload: Omit<
      CreateFeedbackPayload,
      'page_path' | 'user_agent' | 'room_id'
    > & { room_id?: string },
  ): Promise<FeedbackCreatedResponse> => {
    const { room_id, ...data } = payload;
    return wrappedFetch<FeedbackCreatedResponse>('/feedback', {
      method: 'POST',
      body: { ...data, ...context(room_id) },
    });
  };

  return { submitFeedback };
};
