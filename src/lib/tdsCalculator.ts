export interface TDSResult {
  grossAmount: number;
  tdsRate: number;
  tdsAmount: number;
  netAmount: number;
  panAvailable: boolean;
}

/**
 * Indian MLM commission TDS rules:
 * - Below ₹15,000 annual: No TDS
 * - Above ₹15,000 with PAN: 5% TDS (Section 194H)
 * - Above ₹15,000 without PAN: 20% TDS
 */
export function calculateTDS(
  grossAmount: number,
  annualProjected: number,
  hasPAN: boolean
): TDSResult {
  // If annual earnings are projected to be below the threshold, no TDS is deducted
  if (annualProjected <= 15000) {
    return { 
      grossAmount, 
      tdsRate: 0, 
      tdsAmount: 0, 
      netAmount: grossAmount, 
      panAvailable: hasPAN 
    };
  }
  
  // Rate is 5% with PAN, 20% without PAN
  const rate = hasPAN ? 0.05 : 0.20;
  const tdsAmount = Math.round(grossAmount * rate);
  const netAmount = grossAmount - tdsAmount;

  return { 
    grossAmount, 
    tdsRate: rate * 100, 
    tdsAmount, 
    netAmount, 
    panAvailable: hasPAN 
  };
}

/**
 * GST @ 18% is applicable on commission income
 * This is usually handled on the company side before distributing commission
 */
export function calculateGSTOnCommission(commissionAmount: number): number {
  return Math.round(commissionAmount * 0.18);
}
