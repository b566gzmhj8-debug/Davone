// Supabase Edge Function: line-notify
// ยิงข้อความแจ้งเตือนเข้า LINE OA (broadcast) เมื่อพนักงานมอบเงินสด
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const LINE_TOKEN = Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN") ?? "";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function fmt(amount: number, currency: string): string {
  const n = Number(amount).toLocaleString("en-US");
  if (currency === "THB") return `${n} ບາດ`;
  if (currency === "USD") return `$${n}`;
  return `${n} ກີບ`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    if (!LINE_TOKEN) {
      return new Response(JSON.stringify({ ok: false, error: "missing LINE_CHANNEL_ACCESS_TOKEN" }), {
        status: 500, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { name, dept, items, time } = await req.json();

    const amounts = (items ?? []).map((it: any) => "• " + fmt(it.amount, it.currency)).join("\n");
    const t = time ? new Date(Number(time)) : new Date();
    const timeStr = t.toLocaleString("th-TH", {
      dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok",
    });

    const text =
      `💰 ມີການມອບເງິນສົດ\n` +
      `━━━━━━━━━━━━\n` +
      `ພະແນກ: ${dept || "-"}\n` +
      `ພະນັກງານ: ${name || "-"}\n` +
      `ຈຳນວນ:\n${amounts || "-"}\n` +
      `ເວລາ: ${timeStr}`;

    const resp = await fetch("https://api.line.me/v2/bot/message/broadcast", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LINE_TOKEN}`,
      },
      body: JSON.stringify({ messages: [{ type: "text", text }] }),
    });

    const body = await resp.text();
    if (!resp.ok) {
      return new Response(JSON.stringify({ ok: false, status: resp.status, body }), {
        status: 500, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
