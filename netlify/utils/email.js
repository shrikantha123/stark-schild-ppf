async function sendOtpEmail(toEmail, otpCode) {
  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': process.env.BREVO_SMTP_KEY
      },
      body: JSON.stringify({
        sender: {
          name: "Stark Schild PPF",
          email: process.env.EMAIL_FROM
        },
        to: [
          {
            email: toEmail
          }
        ],
        subject: 'Your Warranty Verification OTP - Stark Schild',
        htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; background: #0d0d0d; color: #fff; padding: 30px; border-radius: 12px; border: 1px solid #CC0000;">
          <h2 style="color: #CC0000; letter-spacing: 2px; margin-bottom: 5px;">STARK SCHILD ®</h2>
          <p style="color: #aaa; font-size: 13px; margin-top: 0;">WARRANTY VERIFICATION PORTAL</p>
          <hr style="border-color: #272727; margin: 20px 0;">
          <p style="font-size: 15px;">Your One-Time Password (OTP) for warranty verification is:</p>
          <div style="background: #1a1a1a; border: 1px solid #CC0000; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
            <span style="font-size: 36px; font-weight: bold; letter-spacing: 10px; color: #CC0000;">${otpCode}</span>
          </div>
          <p style="color: #aaa; font-size: 13px;">This OTP is valid for <strong style="color:#fff;">10 minutes</strong>. Do not share it with anyone.</p>
          <hr style="border-color: #272727; margin: 20px 0;">
          <p style="color: #555; font-size: 12px;">If you did not request this, please ignore this email.</p>
        </div>
        `
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Brevo API Error:', errorData);
      throw new Error(errorData.message || 'Failed to send email via Brevo API');
    }

    return { success: true };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error: error.message };
  }
}

async function sendContactEmail(name, email, phone, message) {
  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': process.env.BREVO_SMTP_KEY
      },
      body: JSON.stringify({
        sender: {
          name: "Stark Schild PPF",
          email: process.env.EMAIL_FROM // Verified sender set via Netlify env var
        },
        to: [
          {
            email: "starkschild1@gmail.com"
          }
        ],
        replyTo: {
          email: email,
          name: name
        },
        subject: `New Contact Inquiry from ${name} - Stark Schild`,
        htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; background: #0d0d0d; color: #fff; padding: 30px; border-radius: 12px; border: 1px solid #CC0000;">
          <h2 style="color: #CC0000; letter-spacing: 2px; margin-bottom: 5px;">STARK SCHILD ®</h2>
          <p style="color: #aaa; font-size: 13px; margin-top: 0;">NEW WEBSITE INQUIRY</p>
          <hr style="border-color: #272727; margin: 20px 0;">
          
          <p style="color: #aaa; font-size: 12px; margin-bottom: 5px; text-transform: uppercase;">Name</p>
          <p style="font-size: 16px; margin-top: 0;">${name}</p>

          <p style="color: #aaa; font-size: 12px; margin-bottom: 5px; text-transform: uppercase;">Email</p>
          <p style="font-size: 16px; margin-top: 0;"><a href="mailto:${email}" style="color: #CC0000;">${email}</a></p>

          <p style="color: #aaa; font-size: 12px; margin-bottom: 5px; text-transform: uppercase;">Phone</p>
          <p style="font-size: 16px; margin-top: 0;">${phone || 'Not provided'}</p>

          <p style="color: #aaa; font-size: 12px; margin-bottom: 5px; text-transform: uppercase;">Message</p>
          <div style="background: #1a1a1a; padding: 15px; border-radius: 8px; border-left: 3px solid #CC0000;">
            <p style="font-size: 15px; margin: 0; line-height: 1.5; white-space: pre-wrap;">${message}</p>
          </div>
        </div>
        `
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Brevo API Error:', errorData);
      throw new Error(errorData.message || 'Failed to send contact email via Brevo API');
    }

    return { success: true };
  } catch (error) {
    console.error('Contact email send error:', error);
    return { success: false, error: error.message };
  }
}

module.exports = { sendOtpEmail, sendContactEmail };
