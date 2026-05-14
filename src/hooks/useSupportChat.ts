"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { WS_HOST, WS_PATH } from "@/lib/wsConfig";

// ── Types ──────────────────────────────────────────────────────────────────────

export type MessageStatus = "sending" | "sent" | "failed";

export interface SupportMessage {
  id:             string;
  conversationId: string;
  senderType:     "guest" | "admin" | "system";
  senderId:       string | null;
  content:        string;
  readAt:         string | null;
  createdAt:      string;
  _clientId?:     string;
  _status?:       MessageStatus;
  _retryCount?:   number;
}

export type ConnectionStatus = "idle" | "connecting" | "connected" | "disconnected" | "error";

const ACK_TIMEOUT      = 8_000;
const ACTIVE_DEBOUNCE  = 400;

// ── Hook ───────────────────────────────────────────────────────────────────────

interface UseSupportChatReturn {
  messages:       SupportMessage[];
  status:         ConnectionStatus;
  unreadCount:    number;
  conversationId: string | null;
  adminTyping:    boolean;
  sendMessage:    (content: string, guestName?: string) => void;
  retryMessage:   (clientId: string) => void;
  markRead:       () => void;
  retry:          () => void;
  emitTyping:     (isTyping: boolean) => void;
}

export function useSupportChat(isOpen: boolean): UseSupportChatReturn {
  const [messages,       setMessages]       = useState<SupportMessage[]>([]);
  const [status,         setStatus]         = useState<ConnectionStatus>("idle");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [adminTyping,    setAdminTyping]    = useState(false);

  // ── Derived unread count ───────────────────────────────────────────────────
  const unreadCount = messages.filter(
    m => m.senderType === "admin" && m.readAt === null && !m.id.startsWith("opt-"),
  ).length;

  const socketRef       = useRef<Socket | null>(null);
  const convIdRef       = useRef<string | null>(null);
  const guestNameRef    = useRef<string | undefined>(undefined);
  const pendingRef      = useRef<Map<string, { content: string; retryCount: number; timer: ReturnType<typeof setTimeout> }>>(new Map());
  const bootstrappedRef = useRef(false);
  const isOpenRef       = useRef(isOpen);
  const activeTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Keeps onReconnect and messages always fresh inside stable event listeners.
  const messagesRef     = useRef<SupportMessage[]>([]);
  const onReconnectRef  = useRef<((socket: Socket) => Promise<void>) | null>(null);

  isOpenRef.current   = isOpen;
  messagesRef.current = messages;

  // ── Passive seen ───────────────────────────────────────────────────────────

  const emitActive = useCallback(() => {
    if (activeTimerRef.current) clearTimeout(activeTimerRef.current);
    activeTimerRef.current = setTimeout(() => {
      activeTimerRef.current = null;
      const socket = socketRef.current;
      if (!socket?.connected)                     return;
      if (!isOpenRef.current)                     return;
      if (document.visibilityState !== "visible") return;
      socket.emit("conversation:active");
    }, ACTIVE_DEBOUNCE);
  }, []);

  // ── Send with ACK + timeout ────────────────────────────────────────────────

  const doSend = useCallback((socket: Socket, content: string, clientId: string, retryCount = 0) => {
    setMessages(prev => prev.map(m =>
      m._clientId === clientId ? { ...m, _status: "sending" as MessageStatus, _retryCount: retryCount } : m,
    ));

    const timer = setTimeout(() => {
      pendingRef.current.delete(clientId);
      setMessages(prev => prev.map(m => m._clientId === clientId ? { ...m, _status: "failed" as MessageStatus } : m));
    }, ACK_TIMEOUT);

    pendingRef.current.set(clientId, { content, retryCount, timer });

    socket.emit(
      "message:send",
      { content, clientId, guestName: guestNameRef.current },
      (ack: { ok: boolean; message?: SupportMessage; clientId?: string; error?: string }) => {
        clearTimeout(timer);
        pendingRef.current.delete(clientId);
        if (ack.ok && ack.message) {
          if (!convIdRef.current && ack.message.conversationId) {
            convIdRef.current = ack.message.conversationId;
            setConversationId(ack.message.conversationId);
          }
          setMessages(prev => prev.map(m =>
            m._clientId === clientId
              ? { ...ack.message!, _clientId: clientId, _status: "sent" as MessageStatus }
              : m,
          ));
        } else {
          setMessages(prev => prev.map(m =>
            m._clientId === clientId ? { ...m, _status: "failed" as MessageStatus } : m,
          ));
        }
      },
    );
  }, []);

  // ── Reconnect: sync missed messages + retry pending ────────────────────────

  const onReconnect = useCallback(async (socket: Socket) => {
    const msgs    = messagesRef.current;
    const lastMsg = msgs[msgs.length - 1];
    if (lastMsg) {
      socket.emit("guest:sync", { since: lastMsg.createdAt }, (resp: { ok: boolean; messages?: SupportMessage[] }) => {
        if (resp.ok && resp.messages?.length) {
          setMessages(prev => mergeMessages(prev, resp.messages!.map(m => ({ ...m, _status: "sent" as MessageStatus }))));
        }
      });
    }

    setMessages(prev => {
      const toRetry = prev.filter(m => m._status === "sending" || m._status === "failed");
      for (const msg of toRetry) {
        if (msg._clientId) doSend(socket, msg.content, msg._clientId, (msg._retryCount ?? 0) + 1);
      }
      return prev;
    });

    if (isOpenRef.current) emitActive();
  }, [emitActive, doSend]);

  // Keep the ref always current so the stable connect-event listener picks it up.
  onReconnectRef.current = onReconnect;

  // ── Bootstrap + connect ────────────────────────────────────────────────────

  const connect = useCallback(async () => {
    // If a socket already exists (connected or mid-reconnect) do not create another.
    if (socketRef.current) return;
    setStatus("connecting");

    if (!bootstrappedRef.current) {
      try {
        await fetch("/next-api/support/guest/bootstrap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        });
        bootstrappedRef.current = true;
      } catch { /* non-fatal */ }
    }

    try {
      const histRes = await fetch("/next-api/support/guest/history");
      if (histRes.ok) {
        const data = await histRes.json() as {
          messages: SupportMessage[];
          conversationId?: string;
        };
        if (data.messages?.length)  setMessages(prev => mergeMessages(prev, data.messages));
        if (data.conversationId)  { setConversationId(data.conversationId); convIdRef.current = data.conversationId; }
      }
    } catch { /* non-fatal */ }

    // auth is a callback so socket.io invokes it on every connect attempt.
    // This guarantees a fresh ticket (2-minute TTL) on reconnects after
    // sleep, tab suspension, or long network interruptions.
    const socket = io(`${WS_HOST}/support`, {
      auth: (cb: (data: Record<string, unknown>) => void) => {
        fetch("/next-api/support/guest/ws-ticket", { method: "POST" })
          .then(r => r.ok ? (r.json() as Promise<{ ticket?: string }>) : null)
          .then(data => cb({ guestTicket: data?.ticket ?? "" }))
          .catch(()  => cb({ guestTicket: "" }));
      },
      transports:           ["websocket", "polling"],
      path:                 WS_PATH,
      reconnectionDelay:    2_000,
      reconnectionDelayMax: 15_000,
    });

    socket.on("connected", ({ conversationId: cid }: { role: string; conversationId: string | null }) => {
      setStatus("connected");
      if (cid) { setConversationId(cid); convIdRef.current = cid; }
      if (isOpenRef.current) emitActive();
    });

    socket.on("message:new", (msg: SupportMessage & { clientId?: string }) => {
      const normalized: SupportMessage = {
        ...msg,
        _clientId: msg.clientId ?? msg._clientId,
        _status:   "sent",
      };
      setMessages(prev => mergeMessages(prev, [normalized]));
      if (msg.senderType === "admin" && isOpenRef.current && document.visibilityState === "visible") {
        emitActive();
      }
    });

    socket.on("messages:seen", ({ seenAt, messageIds }: {
      seenBy: string; seenAt: string; messageIds: string[];
    }) => {
      setMessages(prev => prev.map(m =>
        messageIds.includes(m.id) ? { ...m, readAt: seenAt } : m,
      ));
    });

    socket.on("user:typing", ({ senderType, isTyping }: { senderType: string; isTyping: boolean }) => {
      if (senderType === "admin") setAdminTyping(isTyping);
    });

    socket.on("connect", async () => {
      setStatus("connected");
      await onReconnectRef.current?.(socket);
    });

    socket.on("disconnect", (reason) => {
      setAdminTyping(false);
      setStatus("disconnected");
      // socket.io stops auto-reconnecting when the server explicitly closes the
      // connection. Resume manually so recovery still happens.
      if (reason === "io server disconnect") {
        setTimeout(() => socket.connect(), 2_000);
      }
    });

    // Show "disconnected" (not "error") while socket.io retries automatically.
    socket.on("connect_error", () => setStatus("disconnected"));

    socketRef.current = socket;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Reconnect without creating a new socket ────────────────────────────────
  // Called from visibility/online/focus events. Resumes the existing socket's
  // reconnect loop if it exists; otherwise falls back to a full connect().

  const reconnectIfNeeded = useCallback(() => {
    const socket = socketRef.current;
    if (!socket) { connect(); return; }
    if (socket.connected) return;
    // disconnect() resets socket.io's internal backoff timer so the
    // subsequent connect() starts immediately instead of waiting.
    socket.disconnect();
    socket.connect();
  }, [connect]);

  useEffect(() => {
    connect();
    return () => {
      if (activeTimerRef.current) clearTimeout(activeTimerRef.current);
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [connect]);

  // ── Reconnect + passive seen on visibility / network / focus ──────────────

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        reconnectIfNeeded();
        if (isOpenRef.current) emitActive();
      }
    };
    const onOnline = () => reconnectIfNeeded();
    const onFocus  = () => reconnectIfNeeded();

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online",             onOnline);
    window.addEventListener("focus",              onFocus);

    if (isOpen) emitActive();

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online",             onOnline);
      window.removeEventListener("focus",              onFocus);
    };
  }, [isOpen, emitActive, reconnectIfNeeded]);

  // ── Public API ─────────────────────────────────────────────────────────────

  const sendMessage = useCallback((content: string, guestName?: string) => {
    const socket = socketRef.current;
    if (!socket?.connected || !content.trim()) return;
    if (guestName && !guestNameRef.current) guestNameRef.current = guestName;

    const clientId = crypto.randomUUID();
    const optimistic: SupportMessage = {
      id:             `opt-${clientId}`,
      conversationId: convIdRef.current ?? "",
      senderType:     "guest",
      senderId:       null,
      content:        content.trim(),
      readAt:         null,
      createdAt:      new Date().toISOString(),
      _clientId:      clientId,
      _status:        "sending",
    };

    setMessages(prev => [...prev, optimistic]);
    doSend(socket, content.trim(), clientId);
  }, [doSend]);

  const retryMessage = useCallback((clientId: string) => {
    const socket = socketRef.current;
    if (!socket?.connected) return;
    setMessages(prev => {
      const msg = prev.find(m => m._clientId === clientId);
      if (msg) doSend(socket, msg.content, clientId, (msg._retryCount ?? 0) + 1);
      return prev;
    });
  }, [doSend]);

  const markRead = useCallback(() => {
    emitActive();
  }, [emitActive]);

  const retry = useCallback(() => {
    socketRef.current?.disconnect();
    socketRef.current     = null;
    bootstrappedRef.current = false;
    setStatus("idle");
    connect();
  }, [connect]);

  const emitTyping = useCallback((isTyping: boolean) => {
    socketRef.current?.emit("typing", { isTyping });
  }, []);

  return { messages, status, unreadCount, conversationId, adminTyping, sendMessage, retryMessage, markRead, retry, emitTyping };
}

// ── Utility: merge + dedup by id ──────────────────────────────────────────────

function mergeMessages(existing: SupportMessage[], incoming: SupportMessage[]): SupportMessage[] {
  const map = new Map(existing.map(m => [m.id, m]));
  for (const m of incoming) {
    const placeholder = existing.find(
      e => e._clientId && e._clientId === m._clientId && e.id.startsWith("opt-"),
    );
    if (placeholder) map.delete(placeholder.id);
    map.set(m.id, { ...m, _status: m._status ?? "sent" });
  }
  return Array.from(map.values()).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
