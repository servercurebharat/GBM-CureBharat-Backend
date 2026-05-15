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
const userSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    mobile: { type: String, required: true, unique: true },
    email: { type: String },
    password: { type: String },
    role: { type: String, enum: ['admin', 'sh', 'hba', 'hcm', 'hcc'], default: 'hcc' },
    rank: { type: String, enum: ['ADMIN', 'SH', 'HBA', 'HCM', 'HCC'], default: 'HCC' },
    memberId: { type: String, unique: true },
    referrerId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    state: { type: String, required: true },
    status: { type: String, enum: ['active', 'inactive', 'blocked'], default: 'active' },
    kycStatus: { type: String, enum: ['pending', 'approved', 'rejected', 'not_submitted'], default: 'not_submitted' },
    kycDocuments: {
        aadhaarNumber: String,
        aadhaarFrontUrl: String,
        aadhaarBackUrl: String,
        panNumber: String,
        panUrl: String,
        accountNumber: String,
        bankName: String,
        ifscCode: String,
        bankProofUrl: String,
        selfieUrl: String,
    },
    personalSalesCount: { type: Number, default: 0 },
    personalSalesThisMonth: { type: Number, default: 0 },
    personalRecruitsThisMonth: { type: Number, default: 0 },
    lastActiveMonth: { type: String }, // YYYY-MM
    teamSize: { type: Number, default: 0 },
    joiningDate: { type: Date, default: Date.now },
    lastLoginIP: { type: String },
    lastLoginAt: { type: Date },
}, { timestamps: true });
// Indexes
userSchema.index({ role: 1 });
userSchema.index({ referrerId: 1 });
exports.default = mongoose_1.default.models.User || mongoose_1.default.model('User', userSchema);
