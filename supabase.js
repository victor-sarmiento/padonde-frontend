// Configuración de Supabase
const SUPABASE_URL = "https://atbtqlfhkonkogelzddh.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0YnRxbGZoa29ua29nZWx6ZGRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NDU5MDQsImV4cCI6MjA3MjAyMTkwNH0.CEPxbeWPeGH6aJBqRuUewLdLjDV407nY37Pb7acc1GI";

// Importar Supabase
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Crear cliente de Supabase con configuración específica para RLS
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: {
    headers: {
      apikey: SUPABASE_ANON_KEY,
    },
  },
});
