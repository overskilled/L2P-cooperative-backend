import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class MailerService {
    private resend: Resend;

    constructor() {
        this.resend = new Resend(process.env.RESEND_API_KEY!);
    }

    async sendUserCreationMail(email: string, resetLink: string, firstName: string) {
        const subject = "Welcome to L2P Cooperative – Set Your Password";

        const html = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #222;">
            <table width="100%" style="max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden;">
            <tr>
                <td style="background: #004aad; padding: 20px; text-align: center; color: white;">
                <h1 style="margin: 0; font-size: 22px;">L2P Cooperative</h1>
                </td>
            </tr>
            <tr>
                <td style="padding: 25px;">
                <h2 style="margin-top: 0; color: #004aad;">Welcome to L2P Cooperative!</h2>
                <p>Hello, ${firstName}</p>
                <p>Your account has been created by an agency member. To activate it and set your password, please click the button below:</p>
                <p style="text-align: center; margin: 30px 0;">
                    <a href="${resetLink}" style="background: #004aad; color: white; padding: 12px 20px; text-decoration: none; border-radius: 6px; font-size: 16px;">
                    Set Your Password
                    </a>
                </p>
                <p>If the button doesn’t work, copy and paste the link below into your browser:</p>
                <p style="word-break: break-all; color: #004aad;">${resetLink}</p>
                <p style="margin-top: 30px;">Thank you,<br/>The L2P Cooperative Team</p>
                </td>
            </tr>
            <tr>
                <td style="background: #f5f5f5; text-align: center; padding: 15px; font-size: 12px; color: #888;">
                © ${new Date().getFullYear()} L2P Cooperative. All rights reserved.
                </td>
            </tr>
            </table>
        </div>
    `;

        await this.resend.emails.send({
            from: "L2P Cooperative <no-reply@nanosatellitemissions.com>",
            to: email,
            subject,
            html,
        });
    }


    async sendResetPasswordMail(email: string, resetLink: string) {
        const subject = "Reset Your Password – L2P Cooperative";

        const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #222;">
        <table width="100%" style="max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden;">
          <tr>
            <td style="background: #004aad; padding: 20px; text-align: center; color: white;">
              <h1 style="margin: 0; font-size: 22px;">L2P Cooperative</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 25px;">
              <h2 style="margin-top: 0; color: #004aad;">Password Reset Request</h2>
              <p>Hello,</p>
              <p>We received a request to reset your password for your L2P Cooperative account. If this was you, please click the button below to set a new password:</p>
              <p style="text-align: center; margin: 30px 0;">
                <a href="${resetLink}" style="background: #004aad; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-size: 16px;">
                  Reset Password
                </a>
              </p>
              <p>If you did not request a password reset, please ignore this email. Your password will remain unchanged.</p>
              <p>If the button doesn’t work, copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #004aad;">${resetLink}</p>
              <p style="margin-top: 30px;">Thank you,<br/>The L2P Cooperative Team</p>
            </td>
          </tr>
          <tr>
            <td style="background: #f5f5f5; text-align: center; padding: 15px; font-size: 12px; color: #888;">
              © ${new Date().getFullYear()} L2P Cooperative. All rights reserved.
            </td>
          </tr>
        </table>
      </div>
    `;

        await this.resend.emails.send({
            from: "L2P Cooperative <no-reply@l2pcoop.com>",
            to: email,
            subject,
            html,
        });
    }


}
