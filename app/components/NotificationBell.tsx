import { useEffect, useState, useRef } from "react";
import { Link } from "@remix-run/react";

interface Notification {
  id: string;
  type: string;
  category: string;
  title: string;
  message: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

type AuthMode =
  | { type: "wallet"; address: string }
  | { type: "provider"; token: string };

interface NotificationBellProps {
  /** Back-compat: pass walletAddress for merchant (wallet) auth. */
  walletAddress?: string;
  /** Preferred: explicit auth mode — supports both wallet and provider JWT. */
  auth?: AuthMode;
  /** Link target for "View all" footer. Defaults to `/notifications`. */
  viewAllHref?: string;
}

/**
 * Bell icon in header showing unread notification count.
 * Subscribes to SSE for live updates. Works for both merchant (wallet)
 * and provider (JWT) auth.
 */
export function NotificationBell({ walletAddress, auth, viewAllHref = "/notifications" }: NotificationBellProps) {
  const effectiveAuth: AuthMode | null = auth
    ? auth
    : walletAddress
    ? { type: "wallet", address: walletAddress }
    : null;

  const authKey =
    effectiveAuth?.type === "wallet"
      ? effectiveAuth.address
      : effectiveAuth?.type === "provider"
      ? effectiveAuth.token
      : "";

  const authHeaders = (): Record<string, string> => {
    if (!effectiveAuth) return {};
    return effectiveAuth.type === "wallet"
      ? { "X-Wallet-Address": effectiveAuth.address }
      : { Authorization: `Bearer ${effectiveAuth.token}` };
  };
  const [unreadCount, setUnreadCount] = useState(0);
  const [recent, setRecent] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get API base URL (used only for the SSE stream itself)
  const getApiBase = () => {
    if (typeof window !== "undefined") {
      return window.ENV?.PUBLIC_API_URL || "http://localhost:8000";
    }
    return "http://localhost:8000";
  };

  // Merchant (wallet) auth goes through Remix server-side proxy routes
  // because the API's wallet-auth path now requires an X-Stelo-Proxy-Secret
  // header that's server-only. Provider (JWT) auth can still hit the API
  // directly since Bearer tokens don't need the proxy secret.
  const isProvider = effectiveAuth?.type === "provider";

  const fetchJson = async (
    proxyPath: string,
    apiPath: string,
    init?: RequestInit,
  ): Promise<Response> => {
    if (isProvider) {
      return fetch(`${getApiBase()}${apiPath}`, {
        ...init,
        headers: { ...authHeaders(), ...(init?.headers || {}) },
      });
    }
    return fetch(proxyPath, init);
  };

  // Fetch initial unread count + recent notifications
  const refresh = async () => {
    try {
      const [countRes, listRes] = await Promise.all([
        fetchJson(`/api/notifications/unread-count`, `/notifications/unread-count`),
        fetchJson(`/api/notifications/list?limit=10`, `/notifications?limit=10`),
      ]);

      if (countRes.ok) {
        const data = await countRes.json();
        setUnreadCount(data.count || 0);
      }
      if (listRes.ok) {
        const data = await listRes.json();
        setRecent(data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  };

  // Setup SSE connection
  useEffect(() => {
    if (!effectiveAuth) return;

    let cancelled = false;

    const connect = async () => {
      try {
        // Get session token first — via Remix proxy for wallet auth, or
        // directly for provider JWT auth.
        const apiBase = getApiBase();
        const sessionRes = await fetchJson(
          `/api/notifications/session`,
          `/notifications/session`,
          { method: "POST" },
        );

        if (!sessionRes.ok || cancelled) return;

        const { token } = await sessionRes.json();

        // SSE stream runs directly against the API (EventSource can't
        // send headers, so it uses the session-token query param). The
        // token is short-lived and single-recipient so no SSRF concern.
        const es = new EventSource(`${apiBase}/notifications/stream?token=${encodeURIComponent(token)}`);
        eventSourceRef.current = es;

        es.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.id) {
              // New notification — refresh count + list
              refresh();
            }
          } catch {
            // ignore
          }
        };

        es.onerror = () => {
          // Auto-reconnect handled by EventSource
        };
      } catch (err) {
        console.error("SSE connection failed:", err);
      }
    };

    refresh();
    connect();

    // Renew session every 50 minutes
    const renewInterval = setInterval(() => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        connect();
      }
    }, 50 * 60 * 1000);

    return () => {
      cancelled = true;
      clearInterval(renewInterval);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authKey]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  const markAsRead = async (id: string) => {
    try {
      if (isProvider) {
        await fetch(`${getApiBase()}/notifications/${encodeURIComponent(id)}/read`, {
          method: "PATCH",
          headers: authHeaders(),
        });
      } else {
        await fetch(`/api/notifications/mark-read`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
      }
      refresh();
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  };

  const markAllAsRead = async () => {
    try {
      if (isProvider) {
        await fetch(`${getApiBase()}/notifications/read-all`, {
          method: "PATCH",
          headers: authHeaders(),
        });
      } else {
        await fetch(`/api/notifications/mark-all-read`, { method: "POST" });
      }
      refresh();
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="relative w-9 h-9 rounded-full bg-surface-container-low hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors"
        aria-label="Notifications"
      >
        <span className="material-symbols-outlined text-base" aria-hidden>
          notifications
        </span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 stellar-gradient text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-96 max-w-[calc(100vw-2rem)] bg-surface-container rounded-2xl shadow-2xl border border-outline-variant/10 overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/10">
            <h3 className="text-sm font-bold">Notifications</h3>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="text-xs text-primary hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {recent.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <span className="material-symbols-outlined text-3xl text-on-surface-variant/30">
                  notifications_off
                </span>
                <p className="text-xs text-on-surface-variant mt-2">No notifications yet</p>
              </div>
            ) : (
              recent.map((n) => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  onMarkRead={() => markAsRead(n.id)}
                  onClose={() => setOpen(false)}
                />
              ))
            )}
          </div>

          <div className="px-4 py-3 border-t border-outline-variant/10 text-center">
            <Link
              to={viewAllHref}
              className="text-xs font-bold text-primary hover:underline"
              onClick={() => setOpen(false)}
            >
              View all notifications →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationItem({
  notification,
  onMarkRead,
  onClose,
}: {
  notification: Notification;
  onMarkRead: () => void;
  onClose: () => void;
}) {
  const isUnread = !notification.readAt;
  const timeAgo = getTimeAgo(notification.createdAt);

  const content = (
    <>
      <div className="flex items-start gap-3 px-4 py-3 hover:bg-surface-container-high cursor-pointer">
        <div
          className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
            isUnread ? "stellar-gradient" : "bg-transparent"
          }`}
        />
        <div className="flex-1 min-w-0">
          <p className={`text-sm ${isUnread ? "font-bold text-on-surface" : "text-on-surface-variant"}`}>
            {notification.title}
          </p>
          <p className="text-xs text-on-surface-variant/80 mt-0.5 line-clamp-2">
            {notification.message}
          </p>
          <p className="text-[10px] text-on-surface-variant/60 mt-1">{timeAgo}</p>
        </div>
      </div>
    </>
  );

  if (notification.link) {
    return (
      <Link
        to={notification.link}
        onClick={() => {
          if (isUnread) onMarkRead();
          onClose();
        }}
        className="block"
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => isUnread && onMarkRead()}
      className="block w-full text-left"
    >
      {content}
    </button>
  );
}

function getTimeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}
