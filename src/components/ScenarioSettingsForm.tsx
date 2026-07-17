import type { ScenarioSettings } from '../types';
import { Field, MonthInput, NumberInput } from './inputs';

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
      <Field label="월 필수생활비">
        <NumberInput value={value.monthlyEssentialLiving} onChange={(v) => onChange({ monthlyEssentialLiving: v })} step={10000} />
      </Field>
      <Field label="생활비 확보 개월 수">
        <NumberInput value={value.livingReserveMonths} onChange={(v) => onChange({ livingReserveMonths: v })} />
      </Field>
      <Field label="별도 비상금">
        <NumberInput value={value.emergencyFund} onChange={(v) => onChange({ emergencyFund: v })} step={10000} />
      </Field>
      <Field label="단기 확정지출 반영 개월 수">
        <NumberInput value={value.shortTermExpenseMonths} onChange={(v) => onChange({ shortTermExpenseMonths: v })} />
      </Field>
      <Field label="투자배분율(%)">
        <NumberInput
          value={Math.round(value.investmentAllocationRate * 100)}
          onChange={(v) => onChange({ investmentAllocationRate: v / 100 })}
          step={5}
          min={0}
        />
      </Field>
    </div>
  );
}
