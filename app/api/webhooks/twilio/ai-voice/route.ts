import twilio from "twilio";

export const runtime = "nodejs";

// TwiML that bridges an answered Twilio call to the xAI "Nicole" voice agent
// over SIP. Set XAI_SIP_URI (e.g. sip:agent_XXX@sip.voice.x.ai;transport=tls) and,
// if your xAI SIP trunk requires it, XAI_SIP_USERNAME / XAI_SIP_PASSWORD.
// Used as the Voice URL for outbound AI calls (and can back the inbound number).
function build() {
  const t = new twilio.twiml.VoiceResponse();
  const sip = process.env.XAI_SIP_URI;
  if (!sip) {
    t.say({ voice: "Polly.Joanna" }, "The A.I. voice agent is not configured yet. Please try again later.");
    return t;
  }
  const dial = t.dial({ answerOnBridge: true, record: "record-from-answer-dual" });
  const attrs: Record<string, string> = {};
  if (process.env.XAI_SIP_USERNAME) attrs.username = process.env.XAI_SIP_USERNAME;
  if (process.env.XAI_SIP_PASSWORD) attrs.password = process.env.XAI_SIP_PASSWORD;
  dial.sip(attrs, sip);
  return t;
}

export async function POST() {
  return new Response(build().toString(), { headers: { "Content-Type": "text/xml" } });
}
export const GET = POST;
