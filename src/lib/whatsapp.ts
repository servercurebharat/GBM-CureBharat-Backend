import axios from 'axios';

export const sendWhatsAppOTP = async (mobile: string, otp: string): Promise<boolean> => {
  try {
    const apiUrl = process.env.WHATSAPP_API_URL;
    const apiToken = process.env.WHATSAPP_API_TOKEN;
    const templateName = process.env.WHATSAPP_OTP_TEMPLATE_NAME || 'otp';

    if (!apiUrl || !apiToken) {
      console.warn('[WhatsApp] API credentials are not fully configured in .env');
      return false;
    }

    // Authentication templates typically require the number without the + symbol (e.g. 919689420767)
    let formattedMobile = mobile;
    if (mobile.startsWith('+')) {
      formattedMobile = mobile.substring(1);
    } else if (mobile.length === 10) {
      formattedMobile = `91${mobile}`;
    } else if (!mobile.startsWith('91')) {
      formattedMobile = `91${mobile}`; // Fallback
    }

    const payload = {
      to: formattedMobile,
      recipient_type: "individual",
      type: "template",
      template: {
        language: {
          policy: "deterministic",
          code: "en"
        },
        name: templateName,
        components: [
          {
            type: "body",
            parameters: [
              {
                type: "text",
                text: otp
              }
            ]
          },
          {
            type: "button",
            sub_type: "url",
            index: 0,
            parameters: [
              {
                type: "text",
                text: otp
              }
            ]
          }
        ]
      }
    };

    const response = await axios.post(apiUrl, payload, {
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`[WhatsApp] API Response Status:`, response.status);
    console.log(`[WhatsApp] API Response Data:`, JSON.stringify(response.data));

    // Some APIs return 200 OK but contain an error in the body
    if (response.data && (response.data.status === 'error' || response.data.error)) {
      console.error('[WhatsApp] API returned an error in the response body:', response.data);
      return false;
    }

    console.log(`[WhatsApp] OTP sent successfully to ${formattedMobile}.`);
    return true;

  } catch (error: any) {
    console.error(`[WhatsApp] Failed to send OTP to ${mobile}:`, error?.response?.data || error.message);
    return false;
  }
};
