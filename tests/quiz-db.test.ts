import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("quiz migration enforces ownership, atomic validation, publishing and stale-write protection", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create table auth.users (id uuid primary key, raw_user_meta_data jsonb);
      create function auth.uid() returns uuid language sql stable as $$
        select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema auth to authenticated, anon; grant execute on function auth.uid() to authenticated, anon;`);
    await db.exec(await readFile("supabase/migrations/20261124000000_profiles.sql", "utf8"));
    await db.exec(await readFile("supabase/migrations/20261127000000_quizzes.sql", "utf8"));
    const teacher = "11111111-1111-4111-8111-111111111111";
    const other = "22222222-2222-4222-8222-222222222222";
    await db.query("insert into auth.users (id, raw_user_meta_data) values ($1, '{\"display_name\":\"First\"}'), ($2, '{\"display_name\":\"Other\"}')", [teacher, other]);
    await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${teacher}', false);`);
    const payload = { title: "Science", description: "", subject: "", grade: "", topic: "", coverUrl: "", status: "published", questions: [{ text: "What is H2O?", explanation: "Water", timeLimit: 30, points: 100, correctIndex: 0, options: ["Water", "Air", "Salt", "Fire"] }] };
    const saved = await db.query<{ result: { id: string; updatedAt: string } }>("select public.save_teacher_quiz(null, null, $1::jsonb) as result", [JSON.stringify(payload)]);
    const { id, updatedAt } = saved.rows[0].result;
    assert.equal((await db.query("select * from public.quizzes")).rows.length, 1);
    assert.equal((await db.query("select * from public.answer_options where is_correct")).rows.length, 1);
    await assert.rejects(db.query("insert into public.quizzes(owner_id,title) values ($1, 'forged')", [teacher]));
    await assert.rejects(db.query("update public.profiles set role = 'platform_admin' where id = $1", [teacher]));
    await assert.rejects(db.query("select public.save_teacher_quiz($1, $2, $3::jsonb)", [id, updatedAt, JSON.stringify({ ...payload, questions: [{ ...payload.questions[0], options: ["only one"] }] })]));
    assert.equal((await db.query("select * from public.answer_options")).rows.length, 4, "invalid save must roll back");
    await assert.rejects(db.query("select public.save_teacher_quiz(null, null, $1::jsonb)", [JSON.stringify({ ...payload, questions: [] })]));
    const changed = await db.query<{ result: { updatedAt: string } }>("select public.save_teacher_quiz($1, $2, $3::jsonb) as result", [id, updatedAt, JSON.stringify({ ...payload, title: "Updated" })]);
    assert.ok(changed.rows[0].result.updatedAt);
    await assert.rejects(db.query("select public.save_teacher_quiz($1, $2, $3::jsonb)", [id, updatedAt, JSON.stringify(payload)]), "stale update must be rejected");
    await db.exec(`select set_config('request.jwt.claim.sub', '${other}', false);`);
    assert.equal((await db.query("select * from public.quizzes")).rows.length, 0);
    assert.equal((await db.query("select * from public.questions")).rows.length, 0);
    assert.equal((await db.query("select * from public.answer_options")).rows.length, 0);
    const removed = await db.query<{ removed: boolean }>("select public.delete_teacher_quiz($1) as removed", [id]);
    assert.equal(removed.rows[0].removed, false);
    await assert.rejects(db.query("select public.save_teacher_quiz($1, $2, $3::jsonb)", [id, changed.rows[0].result.updatedAt, JSON.stringify(payload)]));
    await db.exec("set role anon");
    await assert.rejects(db.query("select * from public.quizzes"));
    await assert.rejects(db.query("select public.save_teacher_quiz(null, null, $1::jsonb)", [JSON.stringify(payload)]));
    await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${teacher}', false);`);
    assert.equal((await db.query<{ removed: boolean }>("select public.delete_teacher_quiz($1) as removed", [id])).rows[0].removed, true);
    assert.equal((await db.query("select * from public.answer_options")).rows.length, 0);
  } finally { await db.close(); }
});
