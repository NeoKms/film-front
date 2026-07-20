import { io, type Socket } from 'socket.io-client';
import type { RoomResponse } from '~/stores/room';

interface RoomJoinedPayload {
  room_id: string;
  channel_name: string;
  error?: string;
}

interface RoomNewMatchPayload {
  room_id: string;
  film_id: string;
}

export const useRoomRealtime = () => {
  const runtimeConfig = useRuntimeConfig();
  const authStore = useAuthStore();
  const roomStore = useRoomStore();
  const notificationStore = useNotificationStore();
  const socket = shallowRef<Socket | null>(null);
  const connected = ref(false);
  const subscribed = ref(false);

  const disconnect = () => {
    socket.value?.disconnect();
    socket.value = null;
    connected.value = false;
    subscribed.value = false;
  };

  const connect = (roomId: string, onNewMatch?: (filmId: string) => void) => {
    if (!import.meta.client || !runtimeConfig.public.SOCKET_URL) return;
    disconnect();

    const client = io(runtimeConfig.public.SOCKET_URL as string, {
      transports: ['websocket'],
      auth: authStore.accessToken
        ? { token: authStore.accessToken }
        : { guestId: authStore.guestId },
    });
    socket.value = client;

    const subscribeAndResync = async () => {
      connected.value = true;
      client.emit('room.join', { room_id: roomId });
      await roomStore.openRoom(roomId);
    };

    client.on('connect', subscribeAndResync);
    client.on('disconnect', () => {
      connected.value = false;
      subscribed.value = false;
    });
    client.on('room.joined', (payload: RoomJoinedPayload) => {
      subscribed.value = payload.room_id === roomId && !payload.error;
    });
    client.on('room.update', (room: RoomResponse) => {
      const currentUserId = useUserStore().profile?._id;
      if (
        currentUserId &&
        !room.participants.some(
          (participant) => participant._id === currentUserId,
        )
      ) {
        notificationStore.addNotification(
          'Организатор удалил вас из комнаты',
          'warning',
        );
        roomStore.reset();
        disconnect();
        void navigateTo('/');
        return;
      }
      const roomWasClosed =
        roomStore.openedRoom?._id === room._id &&
        roomStore.openedRoom.status !== ERoomStatus.closed &&
        room.status === ERoomStatus.closed;
      roomStore.applyRoomUpdate(room);
      if (roomWasClosed) {
        notificationStore.addNotification('Комната завершена', 'success');
      }
    });
    client.on('room.new-match', (payload: RoomNewMatchPayload) => {
      if (payload.room_id !== roomId) return;
      roomStore.announceMatch(payload.film_id);
      onNewMatch?.(payload.film_id);
      void roomStore.loadMatchedFilms(roomId);
    });
  };

  onBeforeUnmount(disconnect);

  return { connected, subscribed, connect, disconnect };
};
