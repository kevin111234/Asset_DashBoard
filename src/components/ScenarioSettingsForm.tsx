import type { ScenarioSettings } from '../types';
import { Field, MonthInput, NumberInput, SelectInput } from './inputs';

export default function ScenarioSettingsForm({
  value,
  onChange,
}: {
  value: ScenarioSettings;
  onChange: (patch: Partial<ScenarioSettings>) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Field label="시작월">
        <MonthInput value={value.startMonth} onChange={(v) => onChange({ startMonth: v })} />
      </Field>
      <Field label="예측 기간(개월)">
        <NumberInput value={value.forecastMonths} onChange={(v) => onChange({ forecastMonths: v })} />
      </Field>
      <Field label="최소 현금 기준">
        <NumberInput value={value.minimumCashAmount} onChange={(v) => onChange({ minimumCashAmount: v })} step={100000} />
      </Field>
      <Field label="단기 확정지출 반영 기간">
        <SelectInput
          value={String(value.shortTermExpenseMonths)}
          onChange={(v) => onChange({ shortTermExpenseMonths: Number(v) })}
          options={[
            { value: '1', label: '향후 1개월' },
            { value: '3', label: '향후 3개월' },
            { value: '6', label: '향후 6개월' },
          ]}
        />
      </Field>
    </div>
  );
}
