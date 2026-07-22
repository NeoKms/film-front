import { describe, expect, it, vi } from 'vitest';
import {
  buildFeedbackContext,
  hasSubmittedRoomFeedback,
  markRoomFeedbackSubmitted,
  roomFeedbackStorageKey,
} from '../../composables/useFeedback';

describe('feedback helpers', () => {
  it('keeps only safe bounded route and browser context', () => {
    const roomId = '507f1f77bcf86cd799439011';
    expect(
      buildFeedbackContext(
        `/room/${roomId}?invite=secret#matches`,
        'browser'.repeat(100),
        roomId,
      ),
    ).toEqual({
      page_path: `/room/${roomId}`,
      user_agent: 'browser'.repeat(100).slice(0, 500),
      room_id: roomId,
    });
  });

  it('does not attach an invalid room id', () => {
    expect(buildFeedbackContext('/profile', undefined, 'not-an-id')).toEqual({
      page_path: '/profile',
    });
  });

  it('marks room feedback as submitted only after a successful write', () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: vi.fn((key: string) => values.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => values.set(key, value)),
    };
    const roomId = '507f1f77bcf86cd799439011';

    expect(hasSubmittedRoomFeedback(storage, roomId)).toBe(false);
    markRoomFeedbackSubmitted(storage, roomId);
    expect(storage.setItem).toHaveBeenCalledWith(
      roomFeedbackStorageKey(roomId),
      'sent',
    );
    expect(hasSubmittedRoomFeedback(storage, roomId)).toBe(true);
  });
});
