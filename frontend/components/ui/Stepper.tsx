import { Fragment } from 'react';

type StepState = 'done' | 'active' | 'todo';

function Step({ idx, label, state }: { idx: number; label: string; state: StepState }) {
  const cls =
    state === 'active'
      ? 'bg-brand-600 text-white border-brand-600'
      : state === 'done'
        ? 'bg-brand-100 text-brand-700 border-brand-200'
        : 'bg-white text-ink-subtle border-line';
  return (
    <div className="flex items-center gap-2">
      <span className={`w-6 h-6 rounded-full border text-xs font-bold flex items-center justify-center ${cls}`}>
        {idx}
      </span>
      <span className={`hidden sm:inline ${state === 'active' ? 'font-bold text-ink' : 'text-ink-subtle'}`}>
        {label}
      </span>
    </div>
  );
}

/** Checkout-flow progress indicator. `current` is the 1-based active step. */
export default function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="flex items-center justify-center gap-2 text-xs">
      {steps.map((label, i) => (
        <Fragment key={label}>
          {i > 0 && <span className="h-px w-6 sm:w-12 bg-line" />}
          <Step idx={i + 1} label={label} state={i + 1 < current ? 'done' : i + 1 === current ? 'active' : 'todo'} />
        </Fragment>
      ))}
    </div>
  );
}
