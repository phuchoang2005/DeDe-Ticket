export type AlertMessage = { kind: string; text: string };

/** Inline success/error banner. `kind === 'ok'` renders green, anything else red. */
export default function Alert({ message }: { message: AlertMessage | null }) {
  if (!message) return null;
  const tone = message.kind === 'ok' ? 'bg-brand-100 text-brand-700' : 'bg-danger-50 text-danger-600';
  return <div className={`rounded-lg px-4 py-3 text-sm ${tone}`}>{message.text}</div>;
}
