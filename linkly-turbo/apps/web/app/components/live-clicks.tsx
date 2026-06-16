"use client";

import { useEffect, useState } from "react";
import type { LinkClickedEvent } from "@repo/database/types";

const RELAY_URL = process.env.NEXT_PUBLIC_RELAY_URL ?? "ws://localhost:4000";

export function LiveClicks() {
  const [clicks, setClicks] = useState(0);
  const [latest, setLatest] = useState<LinkClickedEvent | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let ws: WebSocket;
    let reconnectTimeout: ReturnType<typeof setTimeout>;

    function connect() {
      ws = new WebSocket(RELAY_URL);

      ws.onopen = () => setConnected(true);

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === "click") {
          setClicks((n) => n + 1);
          setLatest(msg.data);
        }
      };

      ws.onclose = () => {
        setConnected(false);
        // Reconnect after 3 seconds
        reconnectTimeout = setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connect();

    return () => {
      clearTimeout(reconnectTimeout);
      ws?.close();
    };
  }, []);

  return (
    <div className="w-full max-w-md rounded-lg border p-6 text-center space-y-3">
      <div className="flex items-center justify-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
        <span
          className={`inline-block h-2 w-2 rounded-full ${connected ? "bg-green-500 animate-pulse" : "bg-muted-foreground"}`}
        />
        Live clicks
      </div>
      <p className="text-5xl font-mono font-bold text-primary">{clicks}</p>
      {latest ? (
        <p className="text-sm text-muted-foreground">
          Latest: <code className="text-foreground">{latest.code}</code> at{" "}
          <code className="text-foreground">{latest.clicked_at}</code>
        </p>
      ) : (
        <p className="text-sm text-muted-foreground italic">
          Waiting for clicks…
        </p>
      )}
    </div>
  );
}
