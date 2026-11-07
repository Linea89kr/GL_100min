// POST /api/override { answer_id, verdict }  — 호스트의 "판정 뒤집기"
// answers 는 anon 이 update 할 수 없으므로 service_role 로 처리한다.
import { admin, readBody, onlyPost } from "./_lib.js";

const ALLOWED = ["wrong", "correct", "flagged", "pending"];

export default async function handler(req, res) {
  if (!onlyPost(req, res)) return;
  const { answer_id, verdict } = readBody(req);
  if (!answer_id || !ALLOWED.includes(verdict)) return res.status(400).json({ error: "잘못된 요청" });

  const { error } = await admin()
    .from("answers")
    .update({ verdict, host_override: verdict !== "pending" })
    .eq("id", answer_id);
  if (error) return res.status(500).json({ error: error.message });
  res.status(200).json({ ok: true });
}
