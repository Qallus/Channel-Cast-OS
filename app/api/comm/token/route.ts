import twilio from "twilio";

import { defaultNumber, jsonError, ownedNumbers, smsNumbers } from "@/lib/server/twilio";

export const runtime = "nodejs";

// GET /api/comm/token — Twilio Voice access token for the in-browser dialpad,
// plus the number lists the UI needs.
export async function GET() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) {
    return jsonError("Twilio not configured (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN).", 501);
  }

  const apiKeySid = process.env.TWILIO_API_KEY_SID || accountSid;
  const apiKeySecret = process.env.TWILIO_API_KEY_SECRET || authToken;
  const twimlAppSid = process.env.TWILIO_TWIML_APP_SID;

  const AccessToken = twilio.jwt.AccessToken;
  const VoiceGrant = AccessToken.VoiceGrant;
  const voiceGrant = new VoiceGrant({ outgoingApplicationSid: twimlAppSid || undefined, incomingAllow: true });

  const token = new AccessToken(accountSid, apiKeySid, apiKeySecret, { identity: "channelcast-admin", ttl: 3600 });
  token.addGrant(voiceGrant);

  return Response.json({
    token: token.toJwt(),
    identity: "channelcast-admin",
    dialpadReady: Boolean(twimlAppSid), // browser dialing needs a TwiML app
    phoneNumbers: ownedNumbers(),
    defaultPhoneNumber: defaultNumber(),
    smsPhoneNumbers: smsNumbers(),
  });
}
