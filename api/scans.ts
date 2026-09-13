import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;

function client() {
  if (!supabaseUrl || !publishableKey) return null;
  return createClient(supabaseUrl, publishableKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const supabase = client();
  if (!supabase) return res.status(503).json({ error: "Supabase is not configured" });

  if (req.method === "GET") {
    const limit = Math.min(Number(req.query.limit) || 100, 100);
    const { data, error } = await supabase.from("scans").select("id,patient_name,patient_id,scanned_at,eye,risk,score,initials,thumb,source").order("scanned_at", { ascending: false }).limit(limit);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data ?? []);
  }

  if (req.method === "POST") {
    const body = req.body ?? {};
    const record = {
      patient_name: String(body.name || "Unnamed patient").slice(0, 160),
      patient_id: String(body.id || "").slice(0, 80),
      scanned_at: body.scannedAt || new Date().toISOString(),
      eye: body.eye === "OD" ? "OD" : "OS",
      risk: body.risk === "High risk" ? "High risk" : "Normal",
      score: String(body.score || "0%").slice(0, 16),
      initials: String(body.initials || "UP").slice(0, 4),
      thumb: String(body.thumb || "fundus-coral").slice(0, 40),
      source: "live",
    };
    const { data, error } = await supabase.from("scans").insert(record).select("id,patient_name,patient_id,scanned_at,eye,risk,score,initials,thumb,source").single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(data);
  }

  if (req.method === "DELETE") {
    const id = String(req.query.id || "");
    const patientId = String(req.query.patient_id || "");
    if (!id && !patientId) return res.status(400).json({ error: "Scan id or patient_id is required" });
    const query = supabase.from("scans").delete();
    const { error } = id ? await query.eq("id", id) : await query.eq("patient_id", patientId);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(204).end();
  }

  res.setHeader("Allow", "GET, POST, DELETE");
  return res.status(405).json({ error: "Method not allowed" });
}

export const config = { api: { bodyParser: true } };
