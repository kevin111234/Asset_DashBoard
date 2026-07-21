import { useState } from 'react';
import type { BucketKey, EventType, TransferKind } from '../types';
import EventForm from './EventForm';

interface QuickAddButton {
  label: string;
  type: EventType;
  name?: string;
  transferKind?: TransferKind;
  fromBucket?: BucketKey;
  toBucket?: BucketKey;
  sellPercentage?: number;
}

const BUTTONS: QuickAddButton[] = [
  { label: '+ 수입', type: 'income' },
  { label: '+ 지출', type: 'expense' },
  { label: '+ 저축', type: 'transfer', transferKind: 'saving' },
  { label: '+ 투자', type: 'transfer', transferKind: 'investment' },
  { label: '+ 대출', type: 'loan' },
  { label: '+ 자산이동', type: 'transfer', transferKind: 'other' },
  {
    label: '+ 매각',
    type: 'transfer',
    name: '자산 매각',
    transferKind: 'investment',
    fromBucket: 'stock',
    toBucket: 'cash',
    sellPercentage: 100,
  },
];

export default function QuickAddBar({ scenarioId }: { scenarioId: string }) {
  const [open, setOpen] = useState<QuickAddButton | null>(null);

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {BUTTONS.map((b) => (
          <button
            key={b.label}
            onClick={() => setOpen(b)}
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
          initialName={open.name}
          initialTransferKind={open.transferKind}
          initialFromBucket={open.fromBucket}
          initialToBucket={open.toBucket}
          initialSellPercentage={open.sellPercentage}
          onClose={() => setOpen(null)}
        />
      )}
    </>
  );
}
