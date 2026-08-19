import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "SUPABASE_URL yoki SUPABASE_SERVICE_ROLE_KEY .env faylida topilmadi."
  );
}

// Service role key RLS'ni chetlab o'tadi — shuning uchun bu klient
// FAQAT backend serverda ishlatiladi, hech qachon frontendga chiqmaydi.
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);
