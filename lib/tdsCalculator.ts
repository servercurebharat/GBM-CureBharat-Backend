/**
 * TDS (Tax Deducted at Source) Calculator
 * As per Indian IT Act Section 194H for commission income
 */

const TDS_THRESHOLD = 10000; // ₹10,000
const TDS_RATE = 0.05;        // 5%
const GST_ON_COMMISSION = 0.18; // 18% GST on commission income

export interface ITdsResult {
  grossAmount: number;
  tdsAmount: number;
  gstAmount: number;
  netPayable: number;
  isTdsApplicable: boolean;
}

/**
 * Calculate TDS and GST on commission payout amount
 * @param grossAmount - Total provisional balance before deductions
 * @returns Breakdown of TDS, GST, and net payable amount
 */
export function calculateTDS(grossAmount: number): ITdsResult {
  const isTdsApplicable = grossAmount > TDS_THRESHOLD;
  const tdsAmount = isTdsApplicable ? Math.round(grossAmount * TDS_RATE) : 0;
  const gstAmount = Math.round(grossAmount * GST_ON_COMMISSION);
  const netPayable = grossAmount - tdsAmount - gstAmount;

  return {
    grossAmount,
    tdsAmount,
    gstAmount,
    netPayable: Math.max(0, netPayable),
    isTdsApplicable,
  };
}
