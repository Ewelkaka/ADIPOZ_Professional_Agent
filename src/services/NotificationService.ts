import { UserSettings, SettingsService } from './SettingsService';

export type NotificationType = 'SUCCESS' | 'WARNING' | 'ERROR' | 'INFO' | 'MEDICATION_ALERT';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export class NotificationService {
  private static STORAGE_KEY = 'sovereign_ai_notifications';
  private static listeners: ((notifications: AppNotification[]) => void)[] = [];

  static getNotifications(): AppNotification[] {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (!stored) return [];
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }

  static addNotification(type: NotificationType, title: string, message: string): void {
    const settings = SettingsService.getSettings();
    if (!settings.notifications) return;

    const notifications = this.getNotifications();
    const newNotification: AppNotification = {
      id: Date.now().toString(),
      type,
      title,
      message,
      timestamp: new Date().toISOString(),
      read: false,
    };

    const updated = [newNotification, ...notifications].slice(0, 50); // Keep last 50
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
    this.notifyListeners(updated);

    // Browser notification if permitted
    if (Notification.permission === 'granted') {
      new Notification(title, { body: message });
    }
  }

  static markAsRead(id: string): void {
    const notifications = this.getNotifications();
    const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
    this.notifyListeners(updated);
  }

  static clearAll(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    this.notifyListeners([]);
  }

  static subscribe(callback: (notifications: AppNotification[]) => void): () => void {
    this.listeners.push(callback);
    callback(this.getNotifications());
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private static notifyListeners(notifications: AppNotification[]): void {
    this.listeners.forEach(l => l(notifications));
  }

  static async requestPermission(): Promise<void> {
    if ('Notification' in window) {
      await Notification.requestPermission();
    }
  }
}
