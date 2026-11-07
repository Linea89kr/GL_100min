// 서버리스 함수 공용 유틸. 파일명이 _ 로 시작하면 Vercel 이 라우트로 노출하지 않는다.
import { createClient } from "@supabase/supabase-js";

// 같은 값을 가리키는 여러 이름을 허용 (직접 입력 / Vercel Supabase 연동 / Next.js 관례)
export const ENV_NAMES = {
  url: ["SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL"],
  anon: [
    "SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_PUBLISHABLE_KEY", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  ],
  service: ["SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEY"],
  gemini: ["GEMINI_API_KEY", "GOOGLE_API_KEY", "GOOGLE_GENERATIVE_AI_API_KEY"],
};

export function pickEnv(names) {
  for (const name of names) {
    const value = (process.env[name] || "").trim();
    if (value) return { name, value };
  }
  return { name: null, value: "" };
}

export function admin() {
  const url = pickEnv(ENV_NAMES.url).value;
  const key = pickEnv(ENV_NAMES.service).value;
  if (!url || !key) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 환경변수가 없습니다.");
  return createClient(url, key, { auth: { persistSession: false } });
}

// ───────────── LLM: Google Gemini (REST, SDK 없이 fetch) ─────────────
// 모델은 환경변수로 바꿀 수 있다. 판정은 빠른 lite, 해설은 flash 기본.
export const MODELS = {
  judge: process.env.GEMINI_MODEL_JUDGE || "gemini-2.5-flash-lite",
  explain: process.env.GEMINI_MODEL_EXPLAIN || "gemini-2.5-flash",
};

export const hasLLM = () => Boolean(pickEnv(ENV_NAMES.gemini).value);

// 반환: { text, blocked }  — blocked 는 안전 필터 등으로 답을 못 받은 경우
export async function gemini({ model, system, user, schema, maxTokens = 2048 }) {
  const key = pickEnv(ENV_NAMES.gemini).value;
  if (!key) throw new Error("GEMINI_API_KEY 환경변수가 없습니다.");

  const body = {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: "user", parts: [{ text: user }] }],
    generationConfig: {
      maxOutputTokens: maxTokens,
      ...(schema ? { responseMimeType: "application/json", responseSchema: schema } : {}),
    },
  };
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify(body),
    }
  );
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Gemini ${res.status} (${model}): ${json.error?.message || res.statusText}`);

  const cand = json.candidates?.[0];
  if (json.promptFeedback?.blockReason || !cand || ["SAFETY", "PROHIBITED_CONTENT", "BLOCKLIST"].includes(cand.finishReason)) {
    return { text: "", blocked: true };
  }
  const text = (cand.content?.parts || []).map((p) => p.text || "").join("");
  return { text, blocked: false };
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
