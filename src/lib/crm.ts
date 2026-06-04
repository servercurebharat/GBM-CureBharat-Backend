import { sendEmail } from './mailer';

const CRM_API_URL = 'https://crm.curebharat.com/api/customers';

export const pushToCRMAndEmail = async (sale: any, plan: any) => {
  try {
    // 1. Push basic data to CRM
    const response = await fetch(CRM_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        memberId: sale.policyId,
        memberName: sale.customerName,
        phone: sale.customerMobile,
        email: sale.customerEmail || 'pending@curebharat.com',
        planName: plan.name,
        planStart: new Date().toISOString(),
        planEnd: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
        coveragePrice: plan.price / 100,
        status: 'pending_profile'
      })
    });
    
    if (!response.ok) {
      console.error(`[CRM] Failed to push customer ${sale.policyId}`);
    } else {
      console.log(`[CRM] Customer ${sale.policyId} pushed successfully.`);
    }

    // 2. Send the completion email
    if (sale.customerEmail) {
      if (sale.enrollmentType === 'customer') {
        // Send Customer form link
        const customerFormLink = `https://crm.curebharat.com/complete-profile/${sale.policyId}`;
        await sendEmail(
          sale.customerEmail,
          'Complete Your CureBharat Profile',
          `Hello ${sale.customerName},<br/><br/>
           Thank you for purchasing the ${plan.name}!<br/><br/>
           To generate your official policy document, please complete your profile by clicking the link below:<br/>
           <a href="${customerFormLink}">Complete Profile</a><br/><br/>
           Regards,<br/>CureBharat Team`
        );
      } else {
        // Distributor - they do it via KYC in GBM
        await sendEmail(
          sale.customerEmail,
          'Welcome to CureBharat Family!',
          `Hello ${sale.customerName},<br/><br/>
           Thank you for joining as a CureBharat Partner and purchasing the ${plan.name}!<br/><br/>
           Please log in to your dashboard at <a href="https://gbm.curebharat.com">gbm.curebharat.com</a> and navigate to the <b>KYC</b> section. 
           Once you submit your KYC details, your policy document will be automatically generated.<br/><br/>
           Regards,<br/>CureBharat Team`
        );
      }
      console.log(`[Email] Onboarding email sent to ${sale.customerEmail}.`);
    }

  } catch (error) {
    console.error('[CRM Sync Error]:', error);
  }
};
