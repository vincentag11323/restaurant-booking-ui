import { type FormEvent, useEffect, useRef, useState } from "react";
import { sendChat, type Contact } from "../agentApi/client";
import { ErrorBanner, PageTitle, PlaceCard } from "../components/ui";
import type { ChatMessage, ChatResponse, PendingBooking } from "../types/chat";

const PHONE = /^\+?[0-9 -]{6,20}$/;

function ContactForm({ onDone }: { onDone: (c: Contact) => void }) {
  const [error, setError] = useState<string | null>(null);
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email")).trim();
    const phone = String(form.get("phone")).trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return setError("Please enter your email so we can hold the booking for you.");
    if (phone && !PHONE.test(phone)) return setError("That phone number doesn't look right.");
    onDone({ email, ...(phone && { phone }) });
  }
  return (
    <form onSubmit={onSubmit} className="card space-y-4 p-5" noValidate>
      <p>Book a table by chatting. No account needed, just your email.</p>
      <ErrorBanner message={error} />
      <div>
        <label htmlFor="chat-email" className="field-label">Email</label>
        <input id="chat-email" name="email" type="email" autoComplete="email" className="input" placeholder="email@example.com" />
      </div>
      <div>
        <label htmlFor="chat-phone" className="field-label">Phone (optional)</label>
        <input id="chat-phone" name="phone" type="tel" autoComplete="tel" className="input" placeholder="+62 …" />
      </div>
      <button type="submit" className="btn-primary w-full">Start chatting</button>
    </form>
  );
}

export function ChatPage() {
  const [contact, setContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [last, setLast] = useState<ChatResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // Block body on purpose: an effect must return nothing or a cleanup function.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, last]);

  async function send(history: ChatMessage[], confirm?: PendingBooking) {
    if (!contact) return;
    setBusy(true);
    setError(null);
    setMessages(history);
    try {
      const res = await sendChat(contact, history, confirm);
      setMessages([...history, { role: "assistant", content: res.reply }]);
      setLast(res);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = event.currentTarget.elements.namedItem("message") as HTMLInputElement;
    const text = input.value.trim();
    if (!text || busy) return;
    input.value = "";
    setLast(null);
    void send([...messages, { role: "user", content: text }]);
  }

  const confirm = (option: PendingBooking) => {
    setLast(null);
    void send([...messages, { role: "user", content: "Yes, book it." }], option);
  };

  return (
    <>
      <PageTitle title="Ask the assistant" lead="Tell us the branch, room, date, time and number of guests, and we'll hold a table." />
      {!contact ? (
        <ContactForm onDone={setContact} />
      ) : (
        <div className="space-y-4">
          <ol aria-label="Conversation" className="space-y-3">
            {messages.map((m, i) => (
              <li key={i} className={`max-w-[85%] whitespace-pre-line rounded-[var(--radius-card)] px-4 py-3 ${m.role === "user" ? "ml-auto bg-pine text-white" : "card"}`}>
                <span className="sr-only">{m.role === "user" ? "You: " : "Assistant: "}</span>
                {m.content}
              </li>
            ))}
            {busy && <li role="status" className="text-muted">The assistant is checking…</li>}
          </ol>

          {last?.pendingBooking && (
            <button type="button" className="btn-primary w-full" disabled={busy} onClick={() => confirm(last.pendingBooking!)}>
              Book it
            </button>
          )}
          {last?.alternatives && last.alternatives.length > 0 && (
            <div className="space-y-2" aria-label="Other times">
              {last.alternatives.map((alt, i) => (
                <button key={alt.token} type="button" className="btn-quiet w-full" disabled={busy} onClick={() => confirm(alt)}>
                  Book option {i + 1}: {alt.draft.startTime} on {alt.draft.date}
                </button>
              ))}
            </div>
          )}
          {last?.booking && (
            <section aria-label="Your booking" className="card space-y-2 p-5 text-center">
              <p className="text-sm text-muted">Show this code to the host when you arrive</p>
              <PlaceCard code={last.booking.code} />
            </section>
          )}

          <ErrorBanner message={error} />
          <form onSubmit={onSubmit} className="flex gap-2">
            <label htmlFor="chat-message" className="sr-only">Message</label>
            <input id="chat-message" name="message" className="input flex-1" maxLength={2000} placeholder="Table for 4 tomorrow at 19:30…" disabled={busy} />
            <button type="submit" className="btn-primary" disabled={busy}>Send</button>
          </form>
          <div ref={endRef} />
        </div>
      )}
      <p className="mt-4 text-sm text-muted">Messages are processed by an AI service to make your booking.</p>
    </>
  );
}
