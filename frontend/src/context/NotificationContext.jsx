import { createContext, useContext, useEffect, useRef, useState } from "react";

import { useAuth } from "./AuthContext";
import { api } from "../lib/api";
import { disconnectSharedUserSocket, getSharedUserSocket } from "../lib/socket";

const NotificationContext = createContext(null);

function upsertNotification(items, nextNotification) {
  const filtered = items.filter((item) => item.id !== nextNotification.id);
  return [nextNotification, ...filtered].slice(0, 20);
}

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [lastCreated, setLastCreated] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try {
      const value = window.localStorage.getItem("cc_sound_enabled");
      return value === null ? true : value === "true";
    } catch (_error) {
      return true;
    }
  });
  const soundUnlockedRef = useRef(false);
  const audioContextRef = useRef(null);
  const lastSoundAtRef = useRef(0);
  const pendingChimeRef = useRef(false);

  function unlockSound() {
    if (soundUnlockedRef.current) {
      return;
    }

    soundUnlockedRef.current = true;

    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        audioContextRef.current = new AudioContext();
        void audioContextRef.current.resume?.();
      }
    } catch (_error) {
      audioContextRef.current = null;
    }
  }

  function ensureSoundUnlocked() {
    unlockSound();

    const audioContext = audioContextRef.current;
    if (audioContext && audioContext.state === "suspended") {
      try {
        void audioContext.resume();
      } catch (_error) {
        // ignore
      }
    }

    if (pendingChimeRef.current) {
      pendingChimeRef.current = false;
      playNotificationSound();
    }
  }

  function playNotificationSound() {
    if (!soundEnabled) {
      return;
    }

    if (!soundUnlockedRef.current) {
      return;
    }

    const audioContext = audioContextRef.current;
    if (!audioContext) {
      return;
    }

    try {
      const now = audioContext.currentTime;

      // Avoid spam when multiple notifications arrive in quick succession.
      const nowMs = Date.now();
      if (nowMs - lastSoundAtRef.current < 450) {
        return;
      }
      lastSoundAtRef.current = nowMs;

      const master = audioContext.createGain();
      master.gain.setValueAtTime(0.0001, now);
      master.gain.exponentialRampToValueAtTime(0.09, now + 0.02);
      master.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
      master.connect(audioContext.destination);

      const filter = audioContext.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(1800, now);
      filter.Q.setValueAtTime(0.9, now);
      filter.connect(master);

      const gain = audioContext.createGain();
      gain.gain.setValueAtTime(1, now);
      gain.connect(filter);

      // Soft two-tone chime.
      const oscA = audioContext.createOscillator();
      oscA.type = "triangle";
      oscA.frequency.setValueAtTime(659.25, now); // E5
      oscA.connect(gain);

      const oscB = audioContext.createOscillator();
      oscB.type = "sine";
      oscB.frequency.setValueAtTime(523.25, now + 0.06); // C5
      oscB.connect(gain);

      oscA.start(now);
      oscB.start(now + 0.06);
      oscA.stop(now + 0.28);
      oscB.stop(now + 0.34);
    } catch (_error) {
      return;
    }
  }

  useEffect(() => {
    window.addEventListener("pointerdown", unlockSound, { once: true });
    window.addEventListener("keydown", unlockSound, { once: true });

    return () => {
      window.removeEventListener("pointerdown", unlockSound);
      window.removeEventListener("keydown", unlockSound);
    };
  }, []);

  async function refreshNotifications() {
    if (!user?.id) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    setLoading(true);

    try {
      const response = await api.get(`/users/${user.id}/notifications`);
      setNotifications(response.items || []);
      setUnreadCount(response.unreadCount || 0);
    } catch (_error) {
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }

  async function markNotificationsRead(notificationIds = []) {
    if (!user?.id) {
      return { readIds: [], unreadCount: 0 };
    }

    try {
      const response = await api.post(`/users/${user.id}/notifications/read`, {
        notificationIds
      });

      setNotifications((current) =>
        current.map((item) =>
          !response.readIds.includes(item.id)
            ? item
            : {
                ...item,
                readAt: item.readAt || new Date().toISOString()
              }
        )
      );
      setUnreadCount(response.unreadCount || 0);
      return response;
    } catch (_error) {
      return { readIds: [], unreadCount };
    }
  }

  useEffect(() => {
    if (!user?.id) {
      setNotifications([]);
      setUnreadCount(0);
      disconnectSharedUserSocket();
      return undefined;
    }

    void refreshNotifications();

    const socket = getSharedUserSocket();

    function handleConnect() {
      void refreshNotifications();
    }

    function handleCreated({ notification, unreadCount: nextUnreadCount }) {
      if (!notification) {
        return;
      }

      setNotifications((current) => upsertNotification(current, notification));
      if (typeof nextUnreadCount === "number") {
        setUnreadCount(nextUnreadCount);
      } else {
        setUnreadCount((current) => current + 1);
      }

      setLastCreated({
        id: notification.id,
        type: notification.type,
        questionId: notification.questionId || null,
        peerUserId: notification.peerUserId || null,
        createdAt: Date.now()
      });
      if (!soundUnlockedRef.current) {
        pendingChimeRef.current = true;
        return;
      }

      playNotificationSound();
    }

    function handleRead({ readIds = [], unreadCount: nextUnreadCount }) {
      setNotifications((current) =>
        current.map((item) =>
          readIds.includes(item.id)
            ? {
                ...item,
                readAt: item.readAt || new Date().toISOString()
              }
            : item
        )
      );

      if (typeof nextUnreadCount === "number") {
        setUnreadCount(nextUnreadCount);
      }
    }

    socket.on("connect", handleConnect);
    socket.on("notification:created", handleCreated);
    socket.on("notification:read", handleRead);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("notification:created", handleCreated);
      socket.off("notification:read", handleRead);
    };
  }, [user?.id]);

  const value = {
    loading,
    notifications,
    unreadCount,
    lastCreated,
    soundEnabled,
    setSoundEnabled(nextValue) {
      setSoundEnabled(Boolean(nextValue));
      try {
        window.localStorage.setItem("cc_sound_enabled", String(Boolean(nextValue)));
      } catch (_error) {
        // ignore
      }
    },
    ensureSoundUnlocked,
    markNotificationsRead,
    refreshNotifications
  };

  return (
    <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error("useNotifications must be used inside NotificationProvider");
  }

  return context;
}
