// Supabase Edge Function: davone-alert
// ส่งข้อความแจ้งเตือนระบบ (เช่น เว็บ/ฐานข้อมูลเปิดไม่ได้) เข้า LINE OA แบบ broadcast
// เรียกได้เฉพาะเครื่องตรวจตอนเช้า ที่ส่ง header x-alert-key ตรงกับ secret DAVONE_ALERT_KEY
// (แยกจาก dynamic-responder ที่ใช้แจ้งมอบเงิน — ไม่แตะของเดิม)
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const LINE_TOKEN = Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN") ?? "";
const ALERT_KEY = Deno.env.get("DAVONE_ALERT_KEY") ?? "";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status, headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ ok: false, error: "POST only" }, 405);
  if (!ALERT_KEY || req.headers.get("x-alert-key") !== ALERT_KEY) {
    return json({ ok: false, error: "unauthorized" }, 401);
  }
  if (!LINE_TOKEN) return json({ ok: false, error: "missing LINE_CHANNEL_ACCESS_TOKEN" }, 500);

  try {
    const { text } = await req.json();
    if (typeof text !== "string" || !text.trim()) return json({ ok: false, error: "text required" }, 400);

    const resp = await fetch("https://api.line.me/v2/bot/message/broadcast", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LINE_TOKEN}`,
      },
      body: JSON.stringify({ messages: [{ type: "text", text: text.slice(0, 4900) }] }),
    });

    if (!resp.ok) return json({ ok: false, status: resp.status, body: await resp.text() }, 500);
    return json({ ok: true });
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500);
  }
});
