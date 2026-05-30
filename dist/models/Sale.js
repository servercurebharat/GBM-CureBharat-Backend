"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const saleSchema = new mongoose_1.Schema({
    policyId: { type: String, required: true, unique: true },
    customerName: { type: String, required: true },
    customerMobile: { type: String, required: true },
    customerEmail: { type: String },
    customerState: { type: String },
    nomineeName: { type: String },
    nomineeRelation: { type: String },
    plan: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Plan', required: true },
    saleAmount: { type: Number, required: true },
    businessVolume: { type: Number, required: true },
    sellerId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    sellerMemberId: { type: String, required: true },
    hccId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    hcmId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    hbaId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    shId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    cashfreeOrderId: { type: String },
    cashfreePaymentId: { type: String, sparse: true },
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String, sparse: true },
    paymentMethod: { type: String, enum: ['cashfree', 'razorpay'], default: 'cashfree' },
    sourceType: { type: String, enum: ['dashboard', 'public_link'], default: 'dashboard' },
    // AutoPay / Subscription
    autopayEnabled: { type: Boolean, default: false },
    cashfreeSubscriptionId: { type: String },
    cashfreePlanId: { type: String },
    nextRenewalDate: { type: Date },
    renewalCount: { type: Number, default: 0 },
    // Status
    status: { type: String, enum: ['active', 'cancelled', 'pending_autopay'], default: 'active' },
    commissionProcessed: { type: Boolean, default: false },
    cycleMonth: { type: String, required: true },
}, { timestamps: true });
saleSchema.index({ sellerId: 1 });
saleSchema.index({ cycleMonth: 1 });
// Redundant index removed as it is already defined in the field definition above
// saleSchema.index({ razorpayPaymentId: 1 }, { unique: true });
exports.default = mongoose_1.default.models.Sale || mongoose_1.default.model('Sale', saleSchema);
