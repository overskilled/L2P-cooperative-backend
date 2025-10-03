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
                <p>If the button doesn't work, copy and paste the link below into your browser:</p>
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
              <p>If the button doesn't work, copy and paste this link into your browser:</p>
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

    async sendWelcomeEmail(email: string, firstName: string) {
        const subject = "Welcome to L2P Cooperative!";
        
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
                <p>Hello, ${firstName}!</p>
                <p>We're thrilled to welcome you to the L2P Cooperative community! Your account has been successfully created, we will now review your account and after which you will be able to explore all the features and benefits we offer.</p>
                
                <p>Here's what you will be able do now:</p>
                <ul>
                    <li>Access your personalized dashboard</li>
                    <li>Make instant deposits and withdrawals from your L2P Cooperative account</li>
                    <li>Make instant transfert with other L2P account</li>
                    <li>Participate in community discussions</li>
                </ul>
                
                
                <p>If you have any questions or need assistance, don't hesitate to reach out to our support team.</p>
                
                <p style="margin-top: 30px;">Welcome aboard!<br/>The L2P Cooperative Team</p>
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

    async sendAccountApprovalEmail(email: string, firstName: string) {
        const subject = "Your L2P Cooperative Account Has Been Approved!";
        
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
                <h2 style="margin-top: 0; color: #004aad;">Account Approved!</h2>
                <p>Hello, ${firstName}!</p>
                <p>Great news! Your L2P Cooperative account has been reviewed and approved by our team.</p>
                
                <p>You now have full access to all the features and benefits of our cooperative platform. We're excited to have you as part of our community and look forward to seeing you thrive with us.</p>
                
                <p style="text-align: center; margin: 30px 0;">
                    <a href="${process.env.APP_URL}" style="background: #004aad; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-size: 16px;">
                    Access Your Account
                    </a>
                </p>
                
                <p>If you have any questions or need assistance getting started, please don't hesitate to contact our support team.</p>
                
                <p style="margin-top: 30px;">Welcome to the cooperative!<br/>The L2P Cooperative Team</p>
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

    async sendAccountDeclinedEmail(email: string, firstName: string, declineNotes: string, updateDocumentLink: string) {
        const subject = "Your L2P Cooperative Account Requires Additional Information";
        
        const html = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #222;">
            <table width="100%" style="max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden;">
            <tr>
                <td style="background: #d9534f; padding: 20px; text-align: center; color: white;">
                <h1 style="margin: 0; font-size: 22px;">L2P Cooperative - Account Review</h1>
                </td>
            </tr>
            <tr>
                <td style="padding: 25px;">
                <h2 style="margin-top: 0; color: #d9534f;">Additional Information Required</h2>
                <p>Hello, ${firstName},</p>
                
                <p>Thank you for your interest in joining L2P Cooperative. After reviewing your application, we require some additional information or documentation to complete your registration.</p>
                
                <div style="background: #f8f9fa; padding: 15px; border-left: 4px solid #d9534f; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #d9534f;">Review Notes:</h3>
                    <p style="margin: 0; white-space: pre-line;">${declineNotes}</p>
                </div>
                
                <p>Please review the notes above and update your documents accordingly. Once you've made the necessary changes, click the button below to resubmit your application:</p>
                
                <p style="text-align: center; margin: 30px 0;">
                    <a href="${updateDocumentLink}" style="background: #d9534f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-size: 16px;">
                    Update Your Documents
                    </a>
                </p>
                
                <p>If the button doesn't work, copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #004aad;">${updateDocumentLink}</p>
                
                <p>If you have any questions about the required changes or need assistance, please contact our support team for guidance.</p>
                
                <p style="margin-top: 30px;">Best regards,<br/>The L2P Cooperative Team</p>
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

    async sendNewSignupNotificationToAdmins(
        adminEmails: string[], 
        userData: {
            firstName: string;
            lastName: string;
            email: string;
            signupDate: string;
            userId: string;
        }
    ) {
        const subject = `New User Signup - ${userData.firstName} ${userData.lastName} Requires Verification`;
        const adminDashboardLink = `https://l2p-blue.vercel.app/admin/kyc`;

        const html = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #222;">
            <table width="100%" style="max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden;">
            <tr>
                <td style="background: #ff9800; padding: 20px; text-align: center; color: white;">
                <h1 style="margin: 0; font-size: 22px;">L2P Cooperative - Admin Notification</h1>
                </td>
            </tr>
            <tr>
                <td style="padding: 25px;">
                <h2 style="margin-top: 0; color: #ff9800;">New User Signup Requires Review</h2>
                <p>Hello Admin,</p>
                
                <p>A new user has signed up for L2P Cooperative and is awaiting verification.</p>
                
                <div style="background: #fff3cd; padding: 15px; border: 1px solid #ffeaa7; border-radius: 6px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #856404;">User Details:</h3>
                    <table style="width: 100%;">
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold; width: 120px;">Name:</td>
                            <td style="padding: 8px 0;">${userData.firstName} ${userData.lastName}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold;">Email:</td>
                            <td style="padding: 8px 0;">${userData.email}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold;">Signup Date:</td>
                            <td style="padding: 8px 0;">${userData.signupDate}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold;">Status:</td>
                            <td style="padding: 8px 0; color: #ff9800; font-weight: bold;">PENDING VERIFICATION</td>
                        </tr>
                    </table>
                </div>
                
                <p>Please review the user's application and documents in the admin dashboard:</p>
                
                <p style="text-align: center; margin: 30px 0;">
                    <a href="${adminDashboardLink}" style="background: #ff9800; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-size: 16px;">
                    Review User Application
                    </a>
                </p>
                
                <p>If the button doesn't work, copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #004aad;">${adminDashboardLink}</p>
                
                <p style="margin-top: 30px;">Thank you,<br/>L2P Cooperative System</p>
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

        // Send to all admin emails
        await Promise.all(
            adminEmails.map(email =>
                this.resend.emails.send({
                    from: "L2P Cooperative <admin-notifications@nanosatellitemissions.com>",
                    to: email,
                    subject,
                    html,
                })
            )
        );
    }

}