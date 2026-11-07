// 브라우저가 쓸 공개 설정. anon key 는 공개돼도 되는 키(RLS 가 방어선).
export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({
    supabaseUrl: process.env.SUPABASE_URL || "",
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || "",
    llm: Boolean(process.env.ANTHROPIC_API_KEY),
  });
}
