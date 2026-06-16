import * as React from "react";
import { worker } from "./iii.js";
import "./App.css";

type Click = { code: string; clicked_at: string };
type StreamEvent = {
  event: { type: "create" | "update" | "delete"; data: Click };
};

export default function App() {
  const [url, setUrl] = React.useState("");
  const [code, setCode] = React.useState("");
  const [created, setCreated] = React.useState<{
    code: string;
    url: string;
  } | null>(null);
  const [clicks, setClicks] = React.useState(0);
  const [latest, setLatest] = React.useState<Click | null>(null);

  React.useEffect(() => {
    const fn = worker.registerFunction(
      "ui::on_click",
      async (event: StreamEvent) => {
        setClicks((n) => n + 1);
        setLatest(event.event.data);
        return null;
      },
    );
    const trig = worker.registerTrigger({
      type: "stream",
      function_id: "ui::on_click",
      config: { stream_name: "clicks", group_id: "all" },
    });
    return () => {
      trig.unregister();
      fn.unregister();
    };
  }, []);

  React.useEffect(() => {
    const fn = worker.registerFunction(
      "user::confirm_destructive_op",
      async (data: { action: string; code: string }) => {
        const confirmed = window.confirm(`Confirm: ${data.action}?`);
        return { confirmed };
      },
    );
    return () => fn.unregister();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const link = await worker.trigger<
      { url: string; code?: string },
      { code: string; url: string }
    >({
      function_id: "link::create",
      payload: { url, code: code || undefined },
    });
    setCreated(link);
    setUrl("");
    setCode("");
  }

  return (
    <main className="app">
      <header>
        <h1>
          <span>⚡</span> Linkly
        </h1>
        <p className="subtitle">Shorten links. Stream clicks. In real time.</p>
      </header>

      <div className="card">
        <h2>Create a short link</h2>
        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label>
              Destination URL
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/my-long-url"
                required
              />
            </label>
            <label>
              Custom code <span style={{ opacity: 0.5 }}>(optional)</span>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="my-code"
              />
            </label>
          </div>
          <button type="submit" className="btn">
            Shorten
          </button>
        </form>
      </div>

      {created && (
        <div className="result" key={created.code}>
          <span className="result-icon">✓</span>
          <span className="result-text">
            <strong>{created.code}</strong> → {created.url}
          </span>
        </div>
      )}

      <section className="live-panel">
        <h2>
          <span className="live-dot" aria-hidden="true" />
          Live clicks
        </h2>
        <div className="live-count">{clicks}</div>
        {latest ? (
          <p className="live-latest">
            Latest: <code>{latest.code}</code> at{" "}
            <code>{latest.clicked_at}</code>
          </p>
        ) : (
          <p className="live-empty">Waiting for clicks…</p>
        )}
      </section>
    </main>
  );
}
