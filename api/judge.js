// POST /api/judge { answer_id }
// 제출된 "오답"이 사실 정답(또는 동치)인지 판정해 answers 행을 갱신한다.
// 클라이언트가 보낸 내용은 믿지 않고, answer_id 로 DB 에서 직접 읽는다.
import { admin, claude, textOf, readBody, onlyPost, normalize } from "./_lib.js";

const SCHEMA = {
  type: "object",
  properties: {
    is_correct: { type: "boolean" },
    closeness: { type: "integer", enum: [0, 1, 2, 3] },
    misconception: { type: "string" },
    flag: { type: "boolean" },
  },
  required: ["is_correct", "closeness", "misconception", "flag"],
  additionalProperties: false,
};

const SYSTEM = `당신은 퀴즈 게임 "무한의 오답 협동조합"의 판정관입니다.
참가자는 일부러 "오답"을 제출해야 합니다. 당신은 제출이 실수로 정답이 되어버렸는지만 판정합니다.
재미나 품질은 평가하지 않습니다.

- is_correct: 제출이 정답이거나 의미상 동치(표기·대소문자·따옴표·언어 차이 포함)면 true.
- closeness: 0=무관/드립, 1=관련 개념, 2=흔한 오개념(그럴듯함), 3=거의 정답.
- misconception: 어떤 오개념에서 나온 답인지 한국어 한 줄(20자 이내). 드립이면 빈 문자열.
- flag: 욕설·혐오·특정인 인신공격이면 true. 단순 농담은 false.`;

export default async function handler(req, res) {
  if (!onlyPost(req, res)) return;
  const { answer_id } = readBody(req);
  if (!answer_id) return res.status(400).json({ error: "answer_id 필요" });

  const db = admin();
  const { data: ans, error } = await db
    .from("answers")
    .select("id, body, verdict, host_override, question:questions(prompt, answer, accepted_variants)")
    .eq("id", answer_id)
    .single();
  if (error || !ans) return res.status(404).json({ error: "answer 없음" });
  if (ans.host_override || ans.verdict !== "pending") return res.status(200).json({ skipped: true });

  const q = ans.question;
  const variants = [q.answer, ...(q.accepted_variants || [])];
  let result;

  // 1) 정답/동치 표현과 글자 그대로 같으면 LLM 없이 바로 🎯
  if (variants.some((v) => normalize(v) && normalize(v) === normalize(ans.body))) {
    result = { is_correct: true, closeness: 3, misconception: "", flag: false };
  } else if (!process.env.ANTHROPIC_API_KEY) {
    // 2) LLM 키가 없으면 오답으로 처리 (호스트가 뒤집기 가능)
    result = { is_correct: false, closeness: 1, misconception: "", flag: false };
  } else {
    // 3) 소형·고속 모델로 판정
    try {
      const response = await claude().messages.create({
        model: "claude-haiku-5-5",
        max_tokens: 1024,
        system: SYSTEM,
        output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
        messages: [{
          role: "user",
          content:
            `문제: ${q.prompt}\n정답: ${q.answer}\n허용 동치 표현: ${(q.accepted_variants || []).join(", ") || "(없음)"}\n` +
            `제출: ${ans.body}`,
        }],
      });
      if (response.stop_reason === "refusal") {
        result = { is_correct: false, closeness: 0, misconception: "", flag: true };
      } else {
        result = JSON.parse(textOf(response));
      }
    } catch (e) {
      console.error("judge LLM error", e);
      // 장애 시 폴백: pending 으로 남겨두고 호스트가 수동 판정
      return res.status(502).json({ error: "LLM 판정 실패, 호스트 수동 판정 필요" });
    }
  }

  const verdict = result.flag ? "flagged" : result.is_correct ? "correct" : "wrong";
  const { error: upErr } = await db
    .from("answers")
    .update({
      verdict,
      closeness: Math.max(0, Math.min(3, Number(result.closeness) || 0)),
      misconception: String(result.misconception || "").slice(0, 60),
    })
    .eq("id", answer_id)
    .eq("host_override", false); // 그 사이 호스트가 뒤집었으면 덮어쓰지 않음
  if (upErr) return res.status(500).json({ error: upErr.message });

  res.status(200).json({ verdict, ...result });
}
