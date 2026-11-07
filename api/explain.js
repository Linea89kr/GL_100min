// POST /api/explain { question_id }
// 정답 + 가장 많이 속인 오답 3개로 해설을 만들어 questions.explanation 에 저장한다.
import { admin, gemini, hasLLM, MODELS, readBody, onlyPost } from "./_lib.js";

const SYSTEM = `당신은 개발 스터디의 친절한 해설자입니다. 참가자들이 일부러 지어낸 "그럴듯한 오답"을 보고
왜 틀렸는지, 사람들이 어디서 헷갈리는지 짚어줍니다. 한국어, 마크다운 기호(#, *, -) 없이 평문으로 씁니다.`;

export default async function handler(req, res) {
  if (!onlyPost(req, res)) return;
  const { question_id } = readBody(req);
  if (!question_id) return res.status(400).json({ error: "question_id 필요" });

  const db = admin();
  const { data: q, error } = await db.from("questions").select("*").eq("id", question_id).single();
  if (error || !q) return res.status(404).json({ error: "question 없음" });

  const { data: scores } = await db
    .from("answer_scores")
    .select("*")
    .eq("question_id", question_id)
    .neq("verdict", "correct")
    .neq("verdict", "flagged");
  const top = (scores || [])
    .sort((a, b) => b.fooled - a.fooled || b.laughs - a.laughs)
    .slice(0, 3);

  if (!hasLLM()) {
    return res.status(200).json({ explanation: null, error: "GEMINI_API_KEY 없음" });
  }

  const list = top.length
    ? top.map((a, i) => `${i + 1}. ${a.body} (속인 수 ${a.fooled}, 😂 ${a.laughs})`).join("\n")
    : "(오답 없음)";

  try {
    const { text, blocked } = await gemini({
      model: MODELS.explain,
      maxTokens: 8192,
      system: SYSTEM,
      user:
          `문제: ${q.prompt}\n정답: ${q.answer}\n상위 오답:\n${list}\n\n` +
          `아래 형식으로만 출력:\n` +
          `[정답] 정답의 핵심 개념 2줄\n` +
          `[오답1] 왜 틀렸는지 + 어디서 헷갈렸는지 2줄 (오답 수만큼 반복, 오답2, 오답3)\n` +
          `[팁] 이 개념을 기억하는 한 문장`,
    });
    if (blocked || !text.trim()) {
      return res.status(200).json({ explanation: null, error: "해설 생성이 차단되었거나 비어 있음" });
    }
    const explanation = text.trim();
    await db.from("questions").update({ explanation }).eq("id", question_id);
    res.status(200).json({ explanation });
  } catch (e) {
    console.error("explain LLM error", e);
    res.status(502).json({ error: "LLM 해설 실패: " + e.message });
  }
}
