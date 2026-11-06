import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const sb = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
const Body = z.object({ runId: z.string().uuid() });

export const handler: Handler = async (event) => {
  const token = event.headers.authorization?.replace("Bearer ", "");
  const { data: { user } } = await sb.auth.getUser(token);
  if (!user) return { statusCode: 401, body: "Unauthorized" };

  const { runId } = Body.parse(JSON.parse(event.body ?? "{}"));
  const { data: prof } = await sb.from("profiles").select("role").eq("id", user.id).single();
  if (prof?.role !== "admin") return { statusCode: 403, body: "Admins only" };

  const { data: run } = await sb.from("payroll_runs").select("status").eq("id", runId).single();
  if (run?.status !== "draft") return { statusCode: 409, body: "Only draft runs can be approved" };

  await sb.from("payroll_runs").update({ status: "approved" }).eq("id", runId);
  await sb.from("audit_log").insert({ user_id: user.id, action: "approve_run", details: { runId } });
  return { statusCode: 200, body: JSON.stringify({ ok: true }) };
};