import { createFileRoute } from "@tanstack/react-router";

/**
 * Modulo contatti DirittiChiari 2027.
 * Salva il messaggio in contact_messages e lo invia a info@pigiservice.com.
 * Nessun dato della stima ISEE arriva qui: solo ciò che la persona scrive nel modulo.
 */

const DESTINATARIO = "info@pigiservice.com";
const ORIGINI = [
  "https://dirittiok.com",
  "https://www.dirittiok.com",
  "https://dirittiok.lovable.app",
];
const EMAIL_RE = /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[^\s@<>()",;:]{2,}$/;
const LIMITI = { nome: 120, email: 254, telefono: 40, azienda: 160, messaggio: 5000, messaggioMin: 5, perIp10min: 3, perIpGiorno: 10, tempoMinimoMs: 2500 };

function cors(origin: string | null): Record<string, string> {
  const o = (origin || "").replace(/\/+$/, "");
  if (!ORIGINI.includes(o)) return {};
  return { "Access-Control-Allow-Origin": o, "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", Vary: "Origin" };
}

function json(status: number, body: unknown, origin: string | null) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors(origin), "Content-Type": "application/json; charset=utf-8" } });
}

function pulisci(s: unknown, max: number) {
  return String(s ?? "").trim().replace(/\s+/g, " ").slice(0, max);
}

async function hashIp(ip: string, giorno: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`dc2027:${giorno}:${ip}`));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function ipDa(req: Request) {
  const h = req.headers;
  return (h.get("cf-connecting-ip") || h.get("x-forwarded-for") || "").split(",")[0]?.trim() || "0";
}

async function gestisci(request: Request): Promise<Response> {
  const origin = request.headers.get("origin");
  if (request.method === "OPTIONS") {
    return new Response(null, { status: ORIGINI.includes((origin || "").replace(/\/+$/, "")) ? 204 : 403, headers: cors(origin) });
  }
  if (!ORIGINI.includes((origin || "").replace(/\/+$/, ""))) return json(403, { ok: false, errore: "origine" }, origin);
  if (!(request.headers.get("content-type") || "").includes("application/json")) return json(415, { ok: false, errore: "formato" }, origin);
  const testo = await request.text();
  if (testo.length > 20000) return json(413, { ok: false, errore: "campi" }, origin);
  let input: Record<string, unknown>;
  try {
    const p = JSON.parse(testo);
    if (!p || typeof p !== "object" || Array.isArray(p)) throw new Error("x");
    input = p;
  } catch {
    return json(400, { ok: false, errore: "formato" }, origin);
  }

  // Honeypot o invio troppo rapido: rispondiamo ok senza salvare.
  if (pulisci(input["sito_web"], 200) || (typeof input["ms"] === "number" && input["ms"] < LIMITI.tempoMinimoMs)) {
    return json(200, { ok: true }, origin);
  }

  const nome = pulisci(input["nome"], LIMITI.nome);
  const email = pulisci(input["email"], LIMITI.email).toLowerCase();
  const telefono = pulisci(input["telefono"], LIMITI.telefono) || null;
  const azienda = pulisci(input["azienda"], LIMITI.azienda) || null;
  const messaggio = String(input["messaggio"] ?? "").trim().slice(0, LIMITI.messaggio);
  const consenso = input["consenso"] === true;
  if (nome.length < 2) return json(422, { ok: false, errore: "nome" }, origin);
  if (!EMAIL_RE.test(email)) return json(422, { ok: false, errore: "email" }, origin);
  if (messaggio.length < LIMITI.messaggioMin) return json(422, { ok: false, errore: "messaggio" }, origin);
  if (!consenso) return json(422, { ok: false, errore: "consenso" }, origin);

  const ora = new Date();
  const impronta = await hashIp(ipDa(request), ora.toISOString().slice(0, 10));

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = supabaseAdmin;

  const conta = async (improntaFiltro: string | null, dal: string) => {
    let q = db.from("contact_messages").select("id", { count: "exact", head: true }).gte("created_at", dal);
    if (improntaFiltro) q = q.eq("ip_hash", improntaFiltro);
    const { count, error } = await q;
    if (error) throw error;
    return count ?? 0;
  };
  try {
    const [in10, inGiorno] = await Promise.all([
      conta(impronta, new Date(ora.getTime() - 10 * 60_000).toISOString()),
      conta(impronta, new Date(ora.getTime() - 24 * 3600_000).toISOString()),
    ]);
    if (in10 >= LIMITI.perIp10min || inGiorno >= LIMITI.perIpGiorno) return json(429, { ok: false, errore: "troppi" }, origin);
  } catch (e) {
    console.error("[contatto] conteggio", (e as Error)?.message);
  }

  let id: string | null = null;
  try {
    const { data, error } = await db
      .from("contact_messages")
      .insert({
        site: "dirittichiari",
        page_url: pulisci(input["pagina"], 300) || null,
        privacy_url: pulisci(input["privacy"], 300) || null,
        lang: pulisci(input["lingua"], 10) || "it",
        name: nome,
        email,
        phone: telefono,
        company: azienda,
        message: messaggio,
        consent_at: ora.toISOString(),
        ip_hash: impronta,
        user_agent: (request.headers.get("user-agent") || "").slice(0, 300) || null,
        email_status: "pending",
      })
      .select("id")
      .single();
    if (error) throw error;
    if (!data) throw new Error("Missing saved message");
    id = data.id;
  } catch (e) {
    console.error("[contatto] salvataggio", (e as Error)?.message);
  }

  let inviata = false;
  try {
    const { sendLovableEmail } = await import("@lovable.dev/email-js");
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");
    const oggetto = messaggio.toUpperCase().startsWith("TEST")
      ? "TEST – DirittiChiari, messaggio dal modulo contatti"
      : "DirittiChiari – messaggio dal modulo contatti";
    const text = `Nuovo messaggio dal modulo contatti di DirittiChiari 2027.\n\nNome: ${nome}\nEmail: ${email}\nTelefono: ${telefono || "—"}\nAttività: ${azienda || "—"}\n\n${messaggio}\n`;
    const html = `<p>Nuovo messaggio dal modulo contatti di <strong>DirittiChiari 2027</strong>.</p><p>Nome: ${escapeHtml(nome)}<br>Email: ${escapeHtml(email)}<br>Telefono: ${escapeHtml(telefono || "—")}<br>Attività: ${escapeHtml(azienda || "—")}</p><p>${escapeHtml(messaggio).replace(/\n/g, "<br>")}</p>`;
    const result = await sendLovableEmail(
      {
        to: DESTINATARIO,
        from: { name: "DirittiChiari – modulo contatti", address: "noreply@notify.auth.pigiservice.com" },
        sender_domain: "notify.auth.pigiservice.com",
        subject: oggetto,
        html,
        text,
        purpose: "transactional",
        label: "contatto-sito",
        idempotency_key: id || crypto.randomUUID(),
        reply_to: email,
      },
      { apiKey, sendUrl: process.env["LOVABLE_SEND_URL"] },
    );
    inviata = result.success;
    if (id) await db.from("contact_messages").update({ email_status: inviata ? "sent" : "suppressed", email_sent_at: inviata ? new Date().toISOString() : null }).eq("id", id);
  } catch (e) {
    const msg = String((e as Error)?.message || e).slice(0, 300);
    console.error("[contatto] email", msg);
    if (id) {
      try { await db.from("contact_messages").update({ email_status: "failed", email_error: msg }).eq("id", id); } catch { /* Message remains saved. */ }
    }
  }

  if (!id && !inviata) return json(502, { ok: false, errore: "server" }, origin);
  return json(200, { ok: true }, origin);
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] ?? c));
}

function metodoNonConsentito() {
  return new Response("Metodo non consentito", {
    status: 405,
    headers: { Allow: "POST, OPTIONS", "Content-Type": "text/plain; charset=utf-8" },
  });
}

export const Route = createFileRoute("/api/contatto")({
  server: {
    handlers: {
      OPTIONS: ({ request }) => gestisci(request),
      POST: ({ request }) => gestisci(request),
      GET: () => metodoNonConsentito(),
      PUT: () => metodoNonConsentito(),
      PATCH: () => metodoNonConsentito(),
      DELETE: () => metodoNonConsentito(),
    },
  },
});
