const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-line-signature",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const LINE_CHANNEL_ACCESS_TOKEN = Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN") || "";
const LINE_CHANNEL_SECRET = Deno.env.get("LINE_CHANNEL_SECRET") || "";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}

function serviceHeaders(extra: Record<string, string> = {}) {
  return {
    apikey: SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
    ...extra
  };
}

async function supabaseRest(path: string, options: RequestInit = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: serviceHeaders((options.headers || {}) as Record<string, string>)
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(data?.message || data?.details || response.statusText || "Supabase request failed");
  }
  return data;
}

function normalizeSlug(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseRegisterSlug(message: string) {
  const text = String(message || "").trim();
  if (!text) return "";

  const normalized = text.replace(/\s+/g, " ");
  const patterns = [
    /^สมัครแจ้งเตือน\s+(.+)$/i,
    /^ลงทะเบียนแจ้งเตือน\s+(.+)$/i,
    /^แจ้งเตือน\s+(.+)$/i,
    /^register\s+(.+)$/i,
    /^line\s+(.+)$/i
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match?.[1]) return normalizeSlug(match[1]);
  }

  return "";
}

function getLineTargetId(source: Record<string, unknown>) {
  const type = String(source.type || "");
  if (type === "group") return String(source.groupId || "");
  if (type === "room") return String(source.roomId || "");
  return String(source.userId || "");
}

async function updateHomestayLineId(slug: string, lineToId: string) {
  const rows = await supabaseRest(
    `homestays?slug=eq.${encodeURIComponent(slug)}&select=id,slug,name&limit=1`
  );
  const homestay = rows?.[0];
  if (!homestay?.id) return null;

  const updated = await supabaseRest(`homestays?id=eq.${encodeURIComponent(homestay.id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ line_to_id: lineToId })
  });

  return updated?.[0] || homestay;
}

async function replyLine(replyToken: string, text: string) {
  if (!LINE_CHANNEL_ACCESS_TOKEN || !replyToken) return;

  await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: "text", text }]
    })
  });
}

function bufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary);
}

async function verifyLineSignature(rawBody: string, signature: string | null) {
  if (!LINE_CHANNEL_SECRET) return true;
  if (!signature) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(LINE_CHANNEL_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  return bufferToBase64(digest) === signature;
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method === "GET") {
    return jsonResponse({ ok: true, message: "line-webhook is ready" });
  }

  try {
    if (req.method !== "POST") {
      return jsonResponse({ ok: false, message: "Method not allowed" }, 405);
    }
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    }

    const rawBody = await req.text();
    const isValidSignature = await verifyLineSignature(rawBody, req.headers.get("x-line-signature"));
    if (!isValidSignature) {
      return jsonResponse({ ok: false, message: "Invalid LINE signature" }, 401);
    }

    const payload = rawBody ? JSON.parse(rawBody) : {};
    const events = Array.isArray(payload.events) ? payload.events : [];
    const results: unknown[] = [];

    for (const event of events) {
      const type = String(event?.type || "");
      const messageType = String(event?.message?.type || "");
      const replyToken = String(event?.replyToken || "");
      const text = String(event?.message?.text || "").trim();

      if (type !== "message" || messageType !== "text") {
        results.push({ skipped: true, reason: "not_text_message" });
        continue;
      }

      const slug = parseRegisterSlug(text);
      if (!slug) {
        await replyLine(
          replyToken,
          "พิมพ์คำสั่งแบบนี้เพื่อเปิดแจ้งเตือน:\nสมัครแจ้งเตือน slug-ของโฮมสเตย์"
        );
        results.push({ skipped: true, reason: "missing_slug" });
        continue;
      }

      const lineToId = getLineTargetId(event.source || {});
      if (!lineToId) {
        await replyLine(replyToken, "ไม่พบ LINE userId/groupId สำหรับบันทึกแจ้งเตือน");
        results.push({ ok: false, slug, reason: "missing_line_target" });
        continue;
      }

      const homestay = await updateHomestayLineId(slug, lineToId);
      if (!homestay) {
        await replyLine(replyToken, `ไม่พบโฮมสเตย์ slug: ${slug}`);
        results.push({ ok: false, slug, reason: "homestay_not_found" });
        continue;
      }

      await replyLine(
        replyToken,
        `บันทึกแจ้งเตือน LINE สำเร็จ\nโฮมสเตย์: ${homestay.name || homestay.slug || slug}`
      );
      results.push({ ok: true, slug, lineToId });
    }

    return jsonResponse({ ok: true, results });
  } catch (error) {
    return jsonResponse({
      ok: false,
      message: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});
