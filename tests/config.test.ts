import test from "node:test";
import assert from "node:assert/strict";
import { getSupabaseConfig } from "../lib/supabase/config";

test("Supabase configuration rejects missing or malformed values", () => {
  const oldUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const oldKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  try {
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "public-key";
    for (const value of ["", "not-a-url", "https://example.supabase.co/path", "http://example.supabase.co"]) {
      process.env.NEXT_PUBLIC_SUPABASE_URL = value;
      assert.equal(getSupabaseConfig(), null);
    }
    process.env.NEXT_PUBLIC_SUPABASE_URL = " https://example.supabase.co/ ";
    assert.deepEqual(getSupabaseConfig(), { url: "https://example.supabase.co", key: "public-key" });
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = " ";
    assert.equal(getSupabaseConfig(), null);
  } finally {
    if (oldUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = oldUrl;
    if (oldKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    else process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = oldKey;
  }
});
