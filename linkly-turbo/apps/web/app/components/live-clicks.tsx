"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/card";
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
        reconnectTimeout = setTimeout(connect, 3000);
      };

      ws.onerror = () => ws.close();
    }

    connect();
    return () => {
      clearTimeout(reconnectTimeout);
      ws?.close();
    };
  }, []);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <span
            className={`inline-block h-2 w-2 rounded-full ${connected ? "bg-green-500 animate-pulse" : "bg-muted-foreground"}`}
          />
          Live clicks
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-4xl font-mono font-bold">{clicks}</p>
        {latest ? (
          <p className="text-xs text-muted-foreground mt-2">
            Last:{" "}
            <code className="font-medium text-foreground">{latest.code}</code>
            <br />
            <span>{latest.clicked_at}</span>
          </p>
        ) : (
          <p className="text-xs text-muted-foreground mt-2 italic">
            Waiting for clicks…
          </p>
        )}
      </CardContent>
    </Card>
  );
}
