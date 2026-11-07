// 브라우저가 쓸 공개 설정. anon(publishable) key 는 공개돼도 되는 키(RLS 가 방어선).
// Vercel 의 Supabase 연동이나 Next.js 관례로 만든 변수 이름도 같이 받아준다.
import { pickEnv, ENV_NAMES, hasLLM, MODELS } from "./_lib.js";

export default function handler(req, res) {
  const url = pickEnv(ENV_NAMES.url);
  const anon = pickEnv(ENV_NAMES.anon);
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({
    supabaseUrl: url.value,
    supabaseAnonKey: anon.value,
    llm: hasLLM(),
    // 디버그용: 값은 절대 내보내지 않고 "어떤 이름으로 찾았는지"만 알려준다
    found: {
      url: url.name,
      anon: anon.name,
      serviceRole: pickEnv(ENV_NAMES.service).name,
      gemini: pickEnv(ENV_NAMES.gemini).name,
    },
    models: MODELS,
    env: process.env.VERCEL_ENV || "local",
  });
}
