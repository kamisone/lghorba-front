"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

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

const WS_URL           = process.env.API_BASE_URL_BROWSER;
const ACK_TIMEOUT      = 8_000;
const ACTIVE_DEBOUNCE  = 400;

// ── Hook ───────────────────────────────────────────────────────────────────────

interface UseSupportChatReturn {
  messages:       SupportMessage[];
  status:         ConnectionStatus;
  unreadCount:    number;
  conversationId: string | null;
  sendMessage:    (content: string) => void;
  retryMessage:   (clientId: string) => void;
  markRead:       () => void;
  retry:          () => void;
}

export function useSupportChat(isOpen: boolean): UseSupportChatReturn {
  const [messages,       setMessages]       = useState<SupportMessage[]>([]);
  const [status,         setStatus]         = useState<ConnectionStatus>("idle");
  const [conversationId, setConversationId] = useState<string | null>(null);

  // ── Derived unread count ───────────────────────────────────────────────────
  // Count admin messages the guest has not yet seen (readAt === null).
  // Derived from messages state — single source of truth.
  // Eliminates double-counting from competing setState calls on message:new,
  // history fetch, and emitActive.
  const unreadCount = messages.filter(
    m => m.senderType === "admin" && m.readAt === null && !m.id.startsWith("opt-"),
  ).length;

  const socketRef       = useRef<Socket | null>(null);
  const convIdRef       = useRef<string | null>(null);
  const pendingRef      = useRef<Map<string, { content: string; retryCount: number; timer: ReturnType<typeof setTimeout> }>>(new Map());
  const bootstrappedRef = useRef(false);
  const isOpenRef       = useRef(isOpen);
  const activeTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  isOpenRef.current = isOpen;

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
      // No setUnreadCount(0) here — count drops naturally when messages:seen
      // arrives and sets readAt on the admin messages.
    }, ACTIVE_DEBOUNCE);
  }, []);

  // ── Bootstrap + connect ────────────────────────────────────────────────────

  const connect = useCallback(async () => {
    if (socketRef.current?.connected) return;
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

    // Fetch history — messages carry their readAt state from the DB,
    // so the derived unreadCount will be correct without any extra counter.
    try {
      const histRes = await fetch("/next-api/support/guest/history");
      if (histRes.ok) {
        const data = await histRes.json() as {
          messages: SupportMessage[];
          conversationId?: string;
        };
        if (data.messages?.length)  setMessages(prev => mergeMessages(prev, data.messages));
        if (data.conversationId)  { setConversationId(data.conversationId); convIdRef.current = data.conversationId; }
        // unreadGuestCount from DB is intentionally not used here —
        // derived count from readAt is the authoritative value.
      }
    } catch { /* non-fatal */ }

    let ticket: string | null = null;
    try {
      const tr = await fetch("/next-api/support/guest/ws-ticket", { method: "POST" });
      if (tr.ok) ticket = ((await tr.json()) as { ticket?: string }).ticket ?? null;
    } catch { /* non-fatal */ }

    if (!ticket) { setStatus("error"); return; }

    const socket = io(`${WS_URL}/support`, {
      auth:                 { guestTicket: ticket },
      transports:           ["websocket", "polling"],
      reconnectionDelay:    2_000,
      reconnectionDelayMax: 15_000,
    });

    socket.on("connected", ({ conversationId: cid }: { role: string; conversationId: string }) => {
      setStatus("connected");
      setConversationId(cid);
      convIdRef.current = cid;
      if (isOpenRef.current) emitActive();
    });

    socket.on("message:new", (msg: SupportMessage & { clientId?: string }) => {
      const normalized: SupportMessage = {
        ...msg,
        _clientId: msg.clientId ?? msg._clientId,
        _status:   "sent",
      };
      // Adding the message to state is enough — the derived unreadCount
      // increments automatically because the new admin message has readAt === null.
      setMessages(prev => mergeMessages(prev, [normalized]));

      // When widget is open + tab visible, request the server to mark as seen.
      // The resulting messages:seen event will set readAt, dropping the count.
      if (msg.senderType === "admin" && isOpenRef.current && document.visibilityState === "visible") {
        emitActive();
      }
    });

    socket.on("messages:seen", ({ seenAt, messageIds }: {
      seenBy: string; seenAt: string; messageIds: string[];
    }) => {
      // Setting readAt on admin messages causes derived unreadCount to decrease.
      setMessages(prev => prev.map(m =>
        messageIds.includes(m.id) ? { ...m, readAt: seenAt } : m,
      ));
    });

    socket.on("connect",       async () => { setStatus("connected"); await onReconnect(socket); });
    socket.on("disconnect",    ()       => setStatus("disconnected"));
    socket.on("connect_error", ()       => setStatus("error"));

    socketRef.current = socket;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    connect();
    return () => {
      if (activeTimerRef.current) clearTimeout(activeTimerRef.current);
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [connect]);

  // ── Passive seen: open + visibility ───────────────────────────────────────

  useEffect(() => {
    if (!isOpen) return;
    emitActive();
    const onVisibility = () => { if (document.visibilityState === "visible") emitActive(); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [isOpen, emitActive]);

  // ── Reconnect: sync missed messages + retry pending ────────────────────────

  const onReconnect = useCallback(async (socket: Socket) => {
    const lastMsg = messages[messages.length - 1];
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
  }, [messages, emitActive]); // eslint-disable-line react-hooks/exhaustive-deps

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
      { content, clientId },
      (ack: { ok: boolean; message?: SupportMessage; clientId?: string; error?: string }) => {
        clearTimeout(timer);
        pendingRef.current.delete(clientId);
        if (ack.ok && ack.message) {
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

  // ── Public API ─────────────────────────────────────────────────────────────

  const sendMessage = useCallback((content: string) => {
    const socket = socketRef.current;
    if (!socket?.connected || !content.trim()) return;

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
    // Trigger server-side read; count drops when messages:seen updates readAt.
    emitActive();
  }, [emitActive]);

  const retry = useCallback(() => {
    socketRef.current?.disconnect();
    socketRef.current     = null;
    bootstrappedRef.current = false;
    setStatus("idle");
    connect();
  }, [connect]);

  return { messages, status, unreadCount, conversationId, sendMessage, retryMessage, markRead, retry };
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
