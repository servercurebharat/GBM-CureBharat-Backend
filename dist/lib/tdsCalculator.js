"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateTDS = calculateTDS;
exports.calculateGSTOnCommission = calculateGSTOnCommission;
/**
 * Indian MLM commission TDS rules:
 * - Below ₹15,000 annual: No TDS
 * - Above ₹15,000 with PAN: 2% TDS (Section 194H)
 * - Above ₹15,000 without PAN: 20% TDS
 */
function calculateTDS(grossAmount, annualProjected, hasPAN) {
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
    // Rate is 2% with PAN, 20% without PAN
    const rate = hasPAN ? 0.02 : 0.20;
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
function calculateGSTOnCommission(commissionAmount) {
    return Math.round(commissionAmount * 0.18);
}
