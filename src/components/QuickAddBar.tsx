import { useState } from 'react';
import type { EventType, TransferKind } from '../types';
import EventForm from './EventForm';

const BUTTONS: { label: string; type: EventType; transferKind?: TransferKind }[] = [
  { label: '+ 수입', type: 'income' },
  { label: '+ 지출', type: 'expense' },
  { label: '+ 저축', type: 'transfer', transferKind: 'saving' },
  { label: '+ 투자', type: 'transfer', transferKind: 'investment' },
  { label: '+ 대출', type: 'loan' },
  { label: '+ 자산이동', type: 'transfer', transferKind: 'other' },
];

export default function QuickAddBar({ scenarioId }: { scenarioId: string }) {
  const [open, setOpen] = useState<{ type: EventType; transferKind?: TransferKind } | null>(null);

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {BUTTONS.map((b) => (
          <button
            key={b.label}
            onClick={() => setOpen({ type: b.type, transferKind: b.transferKind })}
            className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100 dark:border-indigo-900 dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-900/50"
          >
            {b.label}
          </button>
        ))}
      </div>
      {open && (
        <EventForm
          scenarioId={scenarioId}
          mode="create"
          initialType={open.type}
          initialTransferKind={open.transferKind}
          onClose={() => setOpen(null)}
        />
      )}
    </>
  );
}
