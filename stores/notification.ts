import { defineStore } from 'pinia';
import { ref } from 'vue';

export interface INotification {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

export const useNotificationStore = defineStore('notification', () => {
  const notifications = ref<INotification[]>([]);

  const addNotification = (
    message: string,
    type: INotification['type'] = 'info',
    duration: number = 3000,
  ) => {
    const id = Date.now();
    notifications.value.push({ id, message, type, duration });
    setTimeout(() => removeNotification(id), duration); // Auto-remove after specified duration
  };

  const removeNotification = (id: number) => {
    notifications.value = notifications.value.filter(
      (notification) => notification.id !== id,
    );
  };

  return { notifications, addNotification, removeNotification };
});
