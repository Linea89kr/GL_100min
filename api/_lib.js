// 서버리스 함수 공용 유틸. 파일명이 _ 로 시작하면 Vercel 이 라우트로 노출하지 않는다.
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

export function admin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 환경변수가 없습니다.");
  return createClient(url, key, { auth: { persistSession: false } });
}

let _claude;
export function claude() {
  if (!_claude) _claude = new Anthropic(); // ANTHROPIC_API_KEY 환경변수 사용
  return _claude;
}

export function textOf(response) {
  return response.content.filter((b) => b.type === "text").map((b) => b.text).join("");
}

export function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  try { return JSON.parse(req.body || "{}"); } catch { return {}; }
}

export function onlyPost(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST only" });
    return false;
  }
  return true;
}

export const normalize = (s) =>
  String(s ?? "").toLowerCase().replace(/[\s'"`.,!?()]/g, "");
