"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = exports.sendWelcomeMail = exports.sendPayoutSettlementMail = exports.sendBankStatusMail = exports.sendKYCStatusMail = exports.sendKYCSubmissionAlert = exports.sendOTPMail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const smtpPort = parseInt(process.env.SMTP_PORT || '465');
const transporter = nodemailer_1.default.createTransport({
    host: process.env.SMTP_HOST || 'smtp.titan.email',
    port: smtpPort,
    secure: smtpPort === 465, // Direct SSL/TLS on port 465, STARTTLS on other ports (587)
    auth: {
        user: process.env.EMAIL_USER || 'operations@curebharat.com',
        pass: process.env.EMAIL_PASS || '',
    },
    tls: {
        rejectUnauthorized: false // Bypasses self-signed certificate issues or local firewall blocks
    }
});
const sendOTPMail = async (toEmail, otp) => {
    try {
        const mailOptions = {
            from: `"CureBharat (Noreply)" <${process.env.SENDER_EMAIL || 'operations@curebharat.com'}>`,
            to: toEmail,
            subject: 'CureBharat Account Verification Code (OTP)',
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <h2 style="color: #49D2B5; text-align: center; font-weight: 800;">CureBharat Wellness</h2>
          <hr style="border: 0; border-top: 1px solid #eee;" />
          <p>Hello,</p>
          <p>To verify your identity or complete your registration, please use the following One-Time Password (OTP):</p>
          <div style="text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #131241; background: #f4f6f9; padding: 15px 30px; border-radius: 6px; display: inline-block; border: 1px solid #e2e8f0;">${otp}</span>
          </div>
          <p style="color: #666; font-size: 14px;">This code is highly confidential and will expire in <strong>5 minutes</strong>. If you did not request this OTP, please ignore this email or contact support.</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin-top: 30px;" />
          <p style="color: #999; font-size: 12px; text-align: center;">© ${new Date().getFullYear()} CureBharat Wellness Private Limited. All rights reserved.</p>
        </div>
      `,
        };
        const info = await transporter.sendMail(mailOptions);
        console.log(`[MAIL] Sent OTP ${otp} to ${toEmail} | MessageID: ${info.messageId}`);
        return true;
    }
    catch (error) {
        console.error('[MAIL] sendOTPMail Error:', error);
        return false;
    }
};
exports.sendOTPMail = sendOTPMail;
const sendKYCSubmissionAlert = async (adminEmail, adminName, member) => {
    try {
        const dashboardUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin/kyc`;
        const mailOptions = {
            from: `"CureBharat (Noreply)" <${process.env.SENDER_EMAIL || 'operations@curebharat.com'}>`,
            to: adminEmail,
            subject: `🚨 [KYC Alert] Verification Request from ${member.name} (${member.memberId})`,
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02);">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #10b981; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">CureBharat Wellness</h2>
            <p style="color: #64748b; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin-top: 5px;">Security & Compliance Node</p>
          </div>
          <hr style="border: 0; border-top: 1px solid #f1f5f9; margin-bottom: 25px;" />
          
          <p style="font-size: 15px; color: #1e293b; line-height: 1.6; margin-bottom: 20px;">
            Dear <strong>${adminName}</strong>,
          </p>
          
          <p style="font-size: 14px; color: #334155; line-height: 1.6; margin-bottom: 25px;">
            A new partner network verification request has been submitted. Please review the submitted identity and bank proof documents to approve dashboard authorization.
          </p>
          
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 30px;">
            <h3 style="color: #0f172a; font-size: 12px; font-weight: 800; text-transform: uppercase; margin-top: 0; margin-bottom: 15px; letter-spacing: 0.05em;">Member Profile Details</h3>
            <table style="width: 100%; font-size: 13px; color: #475569; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; font-weight: 600; width: 140px; color: #94a3b8;">Legal Name</td>
                <td style="padding: 6px 0; font-weight: 700; color: #0f172a;">${member.name}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-weight: 600; color: #94a3b8;">Member ID</td>
                <td style="padding: 6px 0; font-family: monospace; font-weight: bold; color: #10b981;">${member.memberId}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-weight: 600; color: #94a3b8;">Mobile Number</td>
                <td style="padding: 6px 0; font-weight: 700; color: #334155;">+91 ${member.mobile}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-weight: 600; color: #94a3b8;">Email Address</td>
                <td style="padding: 6px 0; font-weight: 700; color: #334155;">${member.email || 'Not Provided'}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-weight: 600; color: #94a3b8;">State/Territory</td>
                <td style="padding: 6px 0; font-weight: 700; color: #334155;">${member.state}</td>
              </tr>
            </table>
          </div>
          
          <div style="text-align: center; margin-bottom: 30px;">
            <a href="${dashboardUrl}" style="background-color: #10b981; color: #ffffff; padding: 14px 28px; font-size: 13px; font-weight: 800; text-decoration: none; border-radius: 10px; display: inline-block; box-shadow: 0 4px 10px rgba(16, 185, 129, 0.2); text-transform: uppercase; letter-spacing: 0.05em;">Verify Member Identity</a>
          </div>
          
          <hr style="border: 0; border-top: 1px solid #f1f5f9; margin-top: 30px;" />
          <p style="color: #94a3b8; font-size: 11px; text-align: center; line-height: 1.5; margin-top: 20px;">
            This is an automated system security alert. Please handle all KYC documents in compliance with PMLA, Aadhaar Act, and data privacy guidelines.<br />
            © ${new Date().getFullYear()} CureBharat Wellness Private Limited. All rights reserved.
          </p>
        </div>
      `,
        };
        const info = await transporter.sendMail(mailOptions);
        console.log(`[MAIL] Sent KYC Submission Alert to Admin ${adminEmail} | MessageID: ${info.messageId}`);
        return true;
    }
    catch (error) {
        console.error('[MAIL] sendKYCSubmissionAlert Error:', error);
        return false;
    }
};
exports.sendKYCSubmissionAlert = sendKYCSubmissionAlert;
const sendKYCStatusMail = async (toEmail, userName, memberId, status) => {
    try {
        const isApproved = status === 'approved';
        const mailOptions = {
            from: `"CureBharat (Noreply)" <${process.env.SENDER_EMAIL || 'operations@curebharat.com'}>`,
            to: toEmail,
            subject: `🛡️ [CureBharat] KYC Document Verification ${isApproved ? 'Approved' : 'Rejected'}`,
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02);">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: ${isApproved ? '#10b981' : '#f43f5e'}; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">CureBharat Wellness</h2>
            <p style="color: #64748b; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin-top: 5px;">Compliance Division</p>
          </div>
          <hr style="border: 0; border-top: 1px solid #f1f5f9; margin-bottom: 25px;" />
          
          <p style="font-size: 15px; color: #1e293b; line-height: 1.6; margin-bottom: 20px;">
            Dear <strong>${userName}</strong> (${memberId}),
          </p>
          
          <p style="font-size: 14px; color: #334155; line-height: 1.6; margin-bottom: 25px;">
            Your submitted KYC identity documents have been reviewed by our compliance team. The verification status is: 
            <strong style="color: ${isApproved ? '#10b981' : '#f43f5e'}; text-transform: uppercase;">${status}</strong>.
          </p>
          
          ${isApproved ? `
            <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 15px; margin-bottom: 30px; color: #166534; font-size: 13px; line-height: 1.5;">
              🎉 <strong>Congratulations!</strong> Your account is now fully verified. You can now access your team hierarchy, request withdrawals, and unlock full partner benefits!
            </div>
          ` : `
            <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 15px; margin-bottom: 30px; color: #991b1b; font-size: 13px; line-height: 1.5;">
              ⚠️ <strong>Action Required:</strong> Your documents did not meet our verification criteria. Please log in to your portal, re-upload clear and valid Aadhaar & PAN details, and re-submit for review.
            </div>
          `}
          
          <div style="text-align: center; margin-bottom: 30px;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" style="background-color: ${isApproved ? '#10b981' : '#f43f5e'}; color: #ffffff; padding: 12px 24px; font-size: 13px; font-weight: 800; text-decoration: none; border-radius: 10px; display: inline-block; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1); text-transform: uppercase; letter-spacing: 0.05em;">Log In to Partner Portal</a>
          </div>
          
          <hr style="border: 0; border-top: 1px solid #f1f5f9; margin-top: 30px;" />
          <p style="color: #94a3b8; font-size: 11px; text-align: center; line-height: 1.5; margin-top: 20px;">
            This is an automated compliance notification. If you have questions regarding this decision, please reach out to operations@curebharat.com.<br />
            © ${new Date().getFullYear()} CureBharat Wellness Private Limited. All rights reserved.
          </p>
        </div>
      `
        };
        await transporter.sendMail(mailOptions);
        console.log(`[MAIL] Sent KYC ${status} email to ${toEmail}`);
        return true;
    }
    catch (error) {
        console.error('[MAIL] sendKYCStatusMail Error:', error);
        return false;
    }
};
exports.sendKYCStatusMail = sendKYCStatusMail;
const sendBankStatusMail = async (toEmail, userName, memberId, status) => {
    try {
        const isVerified = status === 'verified';
        const mailOptions = {
            from: `"CureBharat (Noreply)" <${process.env.SENDER_EMAIL || 'operations@curebharat.com'}>`,
            to: toEmail,
            subject: `🛡️ [CureBharat] Bank Account Verification ${isVerified ? 'Approved' : 'Rejected'}`,
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02);">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: ${isVerified ? '#10b981' : '#f43f5e'}; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">CureBharat Wellness</h2>
            <p style="color: #64748b; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin-top: 5px;">Compliance Division</p>
          </div>
          <hr style="border: 0; border-top: 1px solid #f1f5f9; margin-bottom: 25px;" />
          
          <p style="font-size: 15px; color: #1e293b; line-height: 1.6; margin-bottom: 20px;">
            Dear <strong>${userName}</strong> (${memberId}),
          </p>
          
          <p style="font-size: 14px; color: #334155; line-height: 1.6; margin-bottom: 25px;">
            Your submitted bank account information has been reviewed. The verification status is: 
            <strong style="color: ${isVerified ? '#10b981' : '#f43f5e'}; text-transform: uppercase;">${status === 'verified' ? 'Approved' : 'Rejected'}</strong>.
          </p>
          
          ${isVerified ? `
            <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 15px; margin-bottom: 30px; color: #166534; font-size: 13px; line-height: 1.5;">
              💰 <strong>Withdrawals Active!</strong> Your bank account verification was successful. You are now eligible to receive direct commission payouts and withdraw balances from your digital ledger wallet!
            </div>
          ` : `
            <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 15px; margin-bottom: 30px; color: #991b1b; font-size: 13px; line-height: 1.5;">
              ⚠️ <strong>Action Required:</strong> The uploaded bank proof (passbook copy, cancelled cheque, etc.) could not be validated. Please log in to your profile settings, check your bank details, and submit a clear, readable proof.
            </div>
          `}
          
          <div style="text-align: center; margin-bottom: 30px;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" style="background-color: ${isVerified ? '#10b981' : '#f43f5e'}; color: #ffffff; padding: 12px 24px; font-size: 13px; font-weight: 800; text-decoration: none; border-radius: 10px; display: inline-block; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1); text-transform: uppercase; letter-spacing: 0.05em;">Access Wallet & Dashboard</a>
          </div>
          
          <hr style="border: 0; border-top: 1px solid #f1f5f9; margin-top: 30px;" />
          <p style="color: #94a3b8; font-size: 11px; text-align: center; line-height: 1.5; margin-top: 20px;">
            This is an automated compliance notification. If you did not upload these details, please contact operations@curebharat.com immediately.<br />
            © ${new Date().getFullYear()} CureBharat Wellness Private Limited. All rights reserved.
          </p>
        </div>
      `
        };
        await transporter.sendMail(mailOptions);
        console.log(`[MAIL] Sent Bank Details ${status} email to ${toEmail}`);
        return true;
    }
    catch (error) {
        console.error('[MAIL] sendBankStatusMail Error:', error);
        return false;
    }
};
exports.sendBankStatusMail = sendBankStatusMail;
const sendPayoutSettlementMail = async (toEmail, userName, cycleMonth, grossAmount, tdsAmount, netAmount) => {
    try {
        const mailOptions = {
            from: `"CureBharat Finance" <${process.env.SENDER_EMAIL || 'operations@curebharat.com'}>`,
            to: toEmail,
            subject: `💰 CureBharat Commission Payout Finalized - ${cycleMonth}`,
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02);">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #10b981; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">CureBharat Wellness</h2>
            <p style="color: #64748b; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin-top: 5px;">Finance & Commissions Dept.</p>
          </div>
          <hr style="border: 0; border-top: 1px solid #f1f5f9; margin-bottom: 25px;" />
          
          <p style="font-size: 15px; color: #1e293b; line-height: 1.6; margin-bottom: 20px;">
            Dear <strong>${userName}</strong>,
          </p>
          
          <p style="font-size: 14px; color: #334155; line-height: 1.6; margin-bottom: 25px;">
            We are pleased to inform you that your commissions for the settlement cycle <strong>${cycleMonth}</strong> have been successfully finalized and processed. The funds have been moved to your **Available for Withdrawal** wallet!
          </p>

          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 30px;">
            <h4 style="margin: 0 0 15px 0; color: #0f172a; font-size: 14px; font-weight: 800; text-transform: uppercase; tracking-wider;">Settlement Statement Summary</h4>
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 8px 0; color: #64748b;">Gross Earned Commission:</td>
                <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #0f172a;">₹${grossAmount.toFixed(2)}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 8px 0; color: #64748b;">TDS Tax Deduction (2%):</td>
                <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #ef4444;">- ₹${tdsAmount.toFixed(2)}</td>
              </tr>
              <tr style="font-size: 15px; font-weight: 800;">
                <td style="padding: 12px 0 0 0; color: #10b981;">Net Settled Payout:</td>
                <td style="padding: 12px 0 0 0; text-align: right; color: #10b981;">₹${netAmount.toFixed(2)}</td>
              </tr>
            </table>
          </div>

          <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 15px; margin-bottom: 30px; color: #166534; font-size: 13px; line-height: 1.5; text-align: center;">
            💰 <strong>Ready to Withdraw!</strong> Log in to your Partner Portal, head to the <strong>Finance Hub</strong>, and request a direct bank transfer instantly!
          </div>

          <div style="text-align: center; margin-bottom: 30px;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" style="background-color: #10b981; color: #ffffff; padding: 12px 24px; font-size: 13px; font-weight: 800; text-decoration: none; border-radius: 10px; display: inline-block; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1); text-transform: uppercase; letter-spacing: 0.05em;">Access Finance Hub</a>
          </div>
          
          <hr style="border: 0; border-top: 1px solid #f1f5f9; margin-top: 30px;" />
          <p style="color: #94a3b8; font-size: 11px; text-align: center; line-height: 1.5; margin-top: 20px;">
            This is a secure billing and commission processing notification. <br />
            © ${new Date().getFullYear()} CureBharat Wellness Private Limited. All rights reserved.
          </p>
        </div>
      `
        };
        await transporter.sendMail(mailOptions);
        console.log(`[MAIL] Sent Payout Settlement email for cycle ${cycleMonth} to ${toEmail}`);
        return true;
    }
    catch (error) {
        console.error('[MAIL] sendPayoutSettlementMail Error:', error);
        return false;
    }
};
exports.sendPayoutSettlementMail = sendPayoutSettlementMail;
const sendWelcomeMail = async (toEmail, userName, memberId, role) => {
    try {
        const roleLabels = {
            sh: 'State Head (SH)',
            hba: 'Health Business Associate (HBA)',
            hcm: 'Health Care Manager (HCM)',
            hcc: 'Health Care Consultant (HCC)'
        };
        const roleLabel = roleLabels[role.toLowerCase()] || role.toUpperCase();
        const mailOptions = {
            from: `"CureBharat Welcome" <${process.env.SENDER_EMAIL || 'operations@curebharat.com'}>`,
            to: toEmail,
            subject: `🎉 Welcome to CureBharat Wellness - Enrollment Confirmed!`,
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02);">
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="cid:logo" alt="CureBharat Logo" style="max-width: 200px; height: auto;" />
            <p style="color: #64748b; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin-top: 10px;">Partner Onboarding Node</p>
          </div>
          <hr style="border: 0; border-top: 1px solid #f1f5f9; margin-bottom: 25px;" />
          
          <p style="font-size: 15px; color: #1e293b; line-height: 1.6; margin-bottom: 20px;">
            Dear <strong>${userName}</strong>,
          </p>
          
          <p style="font-size: 14px; color: #334155; line-height: 1.6; margin-bottom: 25px;">
            Congratulations! Your enrollment as a <strong>${roleLabel}</strong> with CureBharat Wellness has been successfully confirmed.
          </p>

          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 30px;">
            <h4 style="margin: 0 0 15px 0; color: #0f172a; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em;">Your Partner Credentials</h4>
            <table style="width: 100%; font-size: 13px; color: #475569; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; font-weight: 600; width: 140px; color: #94a3b8;">Partner Name:</td>
                <td style="padding: 6px 0; font-weight: 700; color: #0f172a;">${userName}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-weight: 600; color: #94a3b8;">Member ID:</td>
                <td style="padding: 6px 0; font-family: monospace; font-weight: bold; color: #10b981;">${memberId}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-weight: 600; color: #94a3b8;">Partner Rank:</td>
                <td style="padding: 6px 0; font-weight: 700; color: #334155;">${roleLabel}</td>
              </tr>
            </table>
          </div>

          <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 15px; margin-bottom: 30px; color: #1e3a8a; font-size: 13px; line-height: 1.5;">
            🛡️ <strong>CRITICAL NEXT STEP:</strong><br />
            To complete your enrollment and start building your partner network, please log in to your dashboard and **verify your documents (KYC)**. Once verified, you can immediately begin enrolling partners and tracking overrides!
          </div>

          <div style="text-align: center; margin-bottom: 30px;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" style="background-color: #10b981; color: #ffffff; padding: 14px 28px; font-size: 13px; font-weight: 800; text-decoration: none; border-radius: 10px; display: inline-block; box-shadow: 0 4px 10px rgba(16, 185, 129, 0.2); text-transform: uppercase; letter-spacing: 0.05em;">Log In & Verify Documents</a>
          </div>
          
          <hr style="border: 0; border-top: 1px solid #f1f5f9; margin-top: 30px;" />
          <p style="color: #94a3b8; font-size: 11px; text-align: center; line-height: 1.5; margin-top: 20px;">
            If you did not initiate this enrollment, please contact operations@curebharat.com immediately.<br />
            © ${new Date().getFullYear()} CureBharat Wellness Private Limited. All rights reserved.
          </p>
        </div>
      `,
            attachments: [{
                    filename: 'logo.png',
                    path: 'C:\\Users\\harsh\\Documents\\curebharat-mlm\\MLML_Frontend\\public\\logo.png',
                    cid: 'logo'
                }]
        };
        const info = await transporter.sendMail(mailOptions);
        console.log(`[MAIL] Sent Welcome to ${toEmail} | MessageID: ${info.messageId}`);
        return true;
    }
    catch (error) {
        console.error('[MAIL] sendWelcomeMail Error:', error);
        return false;
    }
};
exports.sendWelcomeMail = sendWelcomeMail;
const sendEmail = async (to, subject, htmlContent) => {
    try {
        const mailOptions = {
            from: `"CureBharat (Noreply)" <${process.env.SENDER_EMAIL || 'operations@curebharat.com'}>`,
            to,
            subject,
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <h2 style="color: #49D2B5; text-align: center; font-weight: 800;">CureBharat Wellness</h2>
          <hr style="border: 0; border-top: 1px solid #eee;" />
          <div style="padding: 20px 0;">
            ${htmlContent}
          </div>
          <hr style="border: 0; border-top: 1px solid #eee; margin-top: 30px;" />
          <p style="color: #999; font-size: 12px; text-align: center;">© ${new Date().getFullYear()} CureBharat Wellness Private Limited. All rights reserved.</p>
        </div>
      `,
        };
        const info = await transporter.sendMail(mailOptions);
        console.log(`[MAIL] Sent generic email to ${to} | MessageID: ${info.messageId}`);
        return true;
    }
    catch (error) {
        console.error('[MAIL] sendEmail Error:', error);
        return false;
    }
};
exports.sendEmail = sendEmail;
