import type { Loan, YearMonth } from '../types';
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

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

export function buildLoanSchedule(loan: Loan): LoanSchedule {
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

  if (loan.repaymentType === 'equal_payment') {
    const payment =
      monthlyRate === 0
        ? loan.principal / term
        : (loan.principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -term));
    for (let i = 0; i < term; i++) {
      const month = addMonths(loan.startMonth, i);
      const interest = round(balance * monthlyRate);
      const isLast = i === term - 1;
      const principalPayment = isLast ? balance : round(payment - interest);
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

  if (loan.repaymentType === 'equal_principal') {
    const principalPortion = loan.principal / term;
    for (let i = 0; i < term; i++) {
      const month = addMonths(loan.startMonth, i);
      const interest = round(balance * monthlyRate);
      const isLast = i === term - 1;
      const principalPayment = isLast ? balance : round(principalPortion);
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
