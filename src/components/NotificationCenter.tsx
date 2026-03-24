import React, { useEffect, useState } from 'react';
import { Bell, X, CheckCircle, AlertTriangle, AlertOctagon, Info, Trash2 } from 'lucide-react';
import { NotificationService, AppNotification } from '../services/NotificationService';

export const NotificationCenter: React.FC = () => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    return NotificationService.subscribe(setNotifications);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const getIcon = (type: string) => {
    switch (type) {
      case 'SUCCESS': return <CheckCircle className="text-emerald-500" size={18} />;
      case 'WARNING': return <AlertTriangle className="text-amber-500" size={18} />;
      case 'ERROR': return <AlertOctagon className="text-red-500" size={18} />;
      case 'MEDICATION_ALERT': return <AlertOctagon className="text-red-600 animate-pulse" size={18} />;
      default: return <Info className="text-blue-500" size={18} />;
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors relative text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Powiadomienia</h3>
              <button 
                onClick={() => NotificationService.clearAll()}
                className="text-[10px] uppercase font-bold text-slate-400 hover:text-red-500 flex items-center gap-1"
              >
                <Trash2 size={12} /> Wyczyść
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-sm italic">
                  Brak nowych powiadomień
                </div>
              ) : (
                notifications.map(n => (
                  <div 
                    key={n.id} 
                    onClick={() => NotificationService.markAsRead(n.id)}
                    className={`p-4 border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer relative ${!n.read ? 'bg-emerald-50/30 dark:bg-emerald-900/10' : ''}`}
                  >
                    <div className="flex gap-3">
                      <div className="mt-0.5">{getIcon(n.type)}</div>
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{n.title}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{n.message}</p>
                        <p className="text-[10px] text-slate-400 mt-1">{new Date(n.timestamp).toLocaleTimeString()}</p>
                      </div>
                    </div>
                    {!n.read && <div className="absolute top-4 right-4 w-2 h-2 bg-emerald-500 rounded-full" />}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
