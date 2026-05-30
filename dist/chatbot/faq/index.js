"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFAQByRole = void 0;
const adminFAQ_1 = require("./adminFAQ");
const shFAQ_1 = require("./shFAQ");
const hbaFAQ_1 = require("./hbaFAQ");
const hcmFAQ_1 = require("./hcmFAQ");
const hccFAQ_1 = require("./hccFAQ");
const getFAQByRole = (role) => {
    switch (role.toLowerCase()) {
        case 'admin':
            return adminFAQ_1.adminFAQ;
        case 'sh':
            return shFAQ_1.shFAQ;
        case 'hba':
            return hbaFAQ_1.hbaFAQ;
        case 'hcm':
            return hcmFAQ_1.hcmFAQ;
        case 'hcc':
            return hccFAQ_1.hccFAQ;
        default:
            return [];
    }
};
exports.getFAQByRole = getFAQByRole;
