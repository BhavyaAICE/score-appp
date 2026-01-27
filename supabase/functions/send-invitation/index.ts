import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvitationRequest {
  email: string;
  role: string;
  eventNames: string[];
  inviterName: string;
  organizationName: string;
  message?: string;
  invitationToken: string;
  acceptUrl: string;
}

const roleInfo: Record<string, { displayName: string; color: string; permissions: string[] }> = {
  co_admin: {
    displayName: "Co-Admin",
    color: "#7c3aed",
    permissions: [
      "Create and manage events",
      "Invite other users",
      "Manage all events",
      "View all results",
      "Export data"
    ]
  },
  event_admin: {
    displayName: "Event Admin",
    color: "#3b82f6",
    permissions: [
      "Manage assigned events",
      "View event results",
      "Export event data"
    ]
  },
  judge: {
    displayName: "Judge",
    color: "#10b981",
    permissions: [
      "Score teams in assigned events",
      "View scoring interface"
    ]
  },
  viewer: {
    displayName: "Viewer",
    color: "#6b7280",
    permissions: [
      "View published results"
    ]
  }
};

const handler = async (req: Request): Promise<Response> => {
  console.log("send-invitation function called");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      email,
      role,
      eventNames,
      inviterName,
      organizationName,
      message,
      invitationToken,
      acceptUrl
    }: InvitationRequest = await req.json();

    console.log(`Sending invitation to ${email} for role ${role}`);

    const roleData = roleInfo[role] || roleInfo.viewer;
    
    const permissionsHtml = roleData.permissions
      .map(p => `<li style="margin-bottom: 4px;">${p}</li>`)
      .join("");
    
    const eventsHtml = eventNames.length > 0
      ? `<p style="color: #374151; margin: 16px 0 8px;"><strong>Events you'll have access to:</strong></p>
         <ul style="margin: 0; padding-left: 20px; color: #6b7280;">
           ${eventNames.map(e => `<li style="margin-bottom: 4px;">${e}</li>`).join("")}
         </ul>`
      : "";

    const personalMessage = message
      ? `<div style="background-color: #f3f4f6; border-radius: 8px; padding: 16px; margin: 20px 0;">
           <p style="color: #64748b; font-size: 14px; margin: 0 0 8px; font-weight: 600;">Personal message from ${inviterName}:</p>
           <p style="color: #374151; margin: 0; font-style: italic;">"${message}"</p>
         </div>`
      : "";

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 40px 20px;">
          <div style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%); padding: 32px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">You're Invited!</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 16px;">Join ${organizationName} on FairScore</p>
            </div>
            
            <!-- Content -->
            <div style="padding: 32px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
                Hi there,
              </p>
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                <strong>${inviterName}</strong> has invited you to join <strong>${organizationName}</strong> on FairScore as a <span style="color: ${roleData.color}; font-weight: 700;">${roleData.displayName}</span>.
              </p>
              
              ${personalMessage}
              
              <!-- Role Badge -->
              <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; margin: 24px 0; border-left: 4px solid ${roleData.color};">
                <p style="color: #1e293b; font-weight: 700; margin: 0 0 12px; font-size: 16px;">
                  Your Role: ${roleData.displayName}
                </p>
                <p style="color: #64748b; margin: 0 0 12px; font-size: 14px;">
                  With this role, you'll be able to:
                </p>
                <ul style="margin: 0; padding-left: 20px; color: #374151; font-size: 14px;">
                  ${permissionsHtml}
                </ul>
              </div>
              
              ${eventsHtml}
              
              <!-- CTA Button -->
              <div style="text-align: center; margin: 32px 0;">
                <a href="${acceptUrl}?token=${invitationToken}" 
                   style="display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 10px; font-weight: 700; font-size: 16px; box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);">
                  Accept Invitation
                </a>
              </div>
              
              <p style="color: #9ca3af; font-size: 13px; text-align: center; margin: 24px 0 0;">
                This invitation will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.
              </p>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                Powered by FairScore - Fair & Transparent Judging
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    const textVersion = `
You're Invited to ${organizationName}!

${inviterName} has invited you to join ${organizationName} on FairScore as a ${roleData.displayName}.

${message ? `Personal message: "${message}"` : ""}

Your Role: ${roleData.displayName}
With this role, you'll be able to:
${roleData.permissions.map(p => `- ${p}`).join("\n")}

${eventNames.length > 0 ? `Events you'll have access to:\n${eventNames.map(e => `- ${e}`).join("\n")}` : ""}

Accept your invitation here:
${acceptUrl}?token=${invitationToken}

This invitation will expire in 7 days.
    `.trim();

    const emailResponse = await resend.emails.send({
      from: "FairScore <onboarding@resend.dev>",
      to: [email],
      subject: `${inviterName} invited you to ${organizationName} on FairScore`,
      html: emailHtml,
      text: textVersion
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, data: emailResponse }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error sending invitation email:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
