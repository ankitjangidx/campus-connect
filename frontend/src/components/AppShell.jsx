import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";
import { formatDateTime } from "../lib/utils";

const primaryLinks = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/profile", label: "My Profile" },
  { to: "/connect", label: "Connect" },
  { to: "/forum", label: "Forum" },
  { to: "/faq", label: "FAQ" }
];

const secondaryLinks = [
  { to: "/connections", label: "Connections" },
  { to: "/questions", label: "My Questions" },
  { to: "/mentorships", label: "Mentorships" },
  { to: "/chat", label: "Chat" }
];

const allLinks = [...primaryLinks, ...secondaryLinks];

function linkClass({ isActive }) {
  return [
    "rounded-lg px-4 py-2 text-sm font-medium transition",
    isActive ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-100"
  ].join(" ");
}

function AppShell() {
  const { user, logout } = useAuth();
  const {
    loading: notificationsLoading,
    notifications,
    unreadCount,
    markNotificationsRead,
    soundEnabled,
    setSoundEnabled,
    ensureSoundUnlocked
  } = useNotifications();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationButtonRef = useRef(null);
  const notificationPanelRef = useRef(null);

  useEffect(() => {
    setMobileNavOpen(false);
    setNotificationsOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!notificationsOpen) {
      return undefined;
    }

    function handlePointerDown(event) {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (notificationButtonRef.current?.contains(target)) {
        return;
      }

      if (notificationPanelRef.current?.contains(target)) {
        return;
      }

      setNotificationsOpen(false);
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setNotificationsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [notificationsOpen]);

  async function handleLogout() {
    setMobileNavOpen(false);
    setNotificationsOpen(false);
    await logout();
    navigate("/login");
  }

  async function handleNotificationClick(notification) {
    if (!notification.readAt) {
      await markNotificationsRead([notification.id]);
    }

    const notifParam = `notif=${encodeURIComponent(String(notification.id))}`;

    if (notification.type === "message") {
      const peerId = notification.peerUserId || notification.actor?.id || "";
      navigate(`/chat/${peerId}?${notifParam}`);
      return;
    }

    if (notification.type === "connection_request") {
      navigate(`/dashboard?${notifParam}`);
      return;
    }

    if (notification.type === "connection_accepted") {
      const peerId = notification.peerUserId || notification.actor?.id || "";
      navigate(`/chat/${peerId}?${notifParam}`);
      return;
    }

    if (notification.type === "connection_rejected") {
      navigate(`/connect?${notifParam}`);
      return;
    }

    if (notification.questionId) {
      navigate(`/forum?questionId=${notification.questionId}&${notifParam}`);
      return;
    }

    navigate(`/forum?${notifParam}`);
  }

  async function handleMarkAllRead() {
    await markNotificationsRead();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <header className="sticky top-0 z-20 border-b bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-lg text-white">
              👥
            </div>
            <div>
              <h1 className="text-xl font-bold">Campus Connect</h1>
              <p className="text-xs text-gray-500">Junior-Senior Network</p>
            </div>
          </div>

          <nav className="hidden items-center gap-2 text-sm xl:flex">
            {primaryLinks.map((item) => (
              <NavLink key={item.to} to={item.to} className={linkClass}>
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="relative flex items-center gap-2">
            <button
              ref={notificationButtonRef}
              className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-700"
              onClick={() => {
                ensureSoundUnlocked();
                setNotificationsOpen((current) => !current);
              }}
              type="button"
              aria-label="Toggle notifications"
              aria-expanded={notificationsOpen}
            >
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M15 17h5l-1.4-1.4a2 2 0 0 1-.6-1.4V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
                <path d="M9 17a3 3 0 0 0 6 0" />
              </svg>
              {unreadCount ? (
                <span className="absolute -right-1 -top-1 min-w-[22px] rounded-full bg-red-500 px-1.5 py-0.5 text-center text-[11px] font-bold leading-4 text-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              ) : null}
            </button>
            <button
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-700 xl:hidden"
              onClick={() => setMobileNavOpen((current) => !current)}
              type="button"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileNavOpen}
            >
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 6h18" />
                <path d="M3 12h18" />
                <path d="M3 18h18" />
              </svg>
            </button>
            <button className="cc-button-danger" onClick={handleLogout} type="button">
              Logout
            </button>

            {notificationsOpen ? (
              <div
                ref={notificationPanelRef}
                className="absolute right-0 top-14 z-30 w-[340px] rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">Notifications</h2>
                    <p className="text-xs text-slate-400">
                      {unreadCount ? `${unreadCount} unread` : "You're all caught up"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                      onClick={() => {
                        const nextValue = !soundEnabled;
                        if (nextValue) {
                          ensureSoundUnlocked();
                        }
                        setSoundEnabled(nextValue);
                      }}
                      type="button"
                    >
                      Sound: {soundEnabled ? "On" : "Off"}
                    </button>
                    {unreadCount ? (
                      <button
                        className="text-xs font-semibold text-blue-700"
                        onClick={handleMarkAllRead}
                        type="button"
                      >
                        Mark all read
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 max-h-[420px] space-y-2 overflow-y-auto pr-1">
                  {notificationsLoading ? (
                    <div className="rounded-2xl bg-slate-50 px-4 py-6 text-sm text-slate-500">
                      Loading notifications...
                    </div>
                  ) : notifications.length ? (
                    notifications.map((notification) => (
                      <button
                        key={notification.id}
                        className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                          notification.readAt
                            ? "border-slate-200 bg-white"
                            : "border-blue-100 bg-blue-50"
                        }`}
                        onClick={() => handleNotificationClick(notification)}
                        type="button"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-slate-900">
                              {notification.title}
                            </p>
                            <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                              {notification.body}
                            </p>
                          </div>
                          {!notification.readAt ? (
                            <span className="mt-1 h-2.5 w-2.5 rounded-full bg-blue-600" />
                          ) : null}
                        </div>
                        <p className="mt-2 text-xs text-slate-400">
                          {formatDateTime(notification.createdAt)}
                        </p>
                      </button>
                    ))
                  ) : (
                    <div className="rounded-2xl bg-slate-50 px-4 py-6 text-sm text-slate-500">
                      No notifications yet.
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {mobileNavOpen ? (
          <div className="border-t bg-white px-4 py-4 xl:hidden">
            <nav className="grid gap-2">
              {allLinks.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={linkClass}
                  onClick={() => setMobileNavOpen(false)}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
        ) : null}
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-8">
        <Outlet />
      </main>
    </div>
  );
}

export default AppShell;
