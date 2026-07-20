import type { YearMonth } from '../types';
import { addMonths } from './month';

export interface LoanMonthEntry {
  month: YearMonth;
  interest: number;
  principalPayment: number;
  payment: number;
  balanceAfter: number;
  proceeds: number;
}

export type LoanSchedule = Map<YearMonth, LoanMonthEntry>;

/** MVP supports only 만기일시상환(bullet) and 직접 월 상환액 입력(manual). */
export interface LoanScheduleInput {
  principal: number;
  annualRate: number;
  startMonth: YearMonth;
  repaymentType: 'bullet' | 'manual';
  termMonths: number;
  /** required when repaymentType === 'manual' */
  manualMonthlyPayment?: number;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

export function buildLoanSchedule(loan: LoanScheduleInput): LoanSchedule {
  const schedule: LoanSchedule = new Map();
  const monthlyRate = loan.annualRate / 12;
  const term = Math.max(1, Math.floor(loan.termMonths));
  let balance = loan.principal;

  if (loan.repaymentType === 'bullet') {
    for (let i = 0; i < term; i++) {
      const month = addMonths(loan.startMonth, i);
      const interest = round(balance * monthlyRate);
      const isLast = i === term - 1;
      const principalPayment = isLast ? balance : 0;
      const balanceAfter = round(balance - principalPayment);
      schedule.set(month, {
        month,
        interest,
        principalPayment,
        payment: round(interest + principalPayment),
        balanceAfter,
        proceeds: i === 0 ? loan.principal : 0,
      });
      balance = balanceAfter;
    }
    return schedule;
  }

  // manual: user-specified fixed monthly payment; stop once balance clears.
  const fixedPayment = loan.manualMonthlyPayment ?? 0;
  for (let i = 0; i < term && balance > 0.01; i++) {
    const month = addMonths(loan.startMonth, i);
    const interest = round(balance * monthlyRate);
    const principalPayment = round(Math.min(Math.max(fixedPayment - interest, 0), balance));
    const balanceAfter = round(balance - principalPayment);
    schedule.set(month, {
      month,
      interest,
      principalPayment,
      payment: round(interest + principalPayment),
      balanceAfter,
      proceeds: i === 0 ? loan.principal : 0,
    });
    balance = balanceAfter;
  }
  return schedule;
}

export function totalInterest(schedule: LoanSchedule): number {
  let sum = 0;
  for (const e of schedule.values()) sum += e.interest;
  return round(sum);
}
