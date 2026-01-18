import { createClient } from '@supabase/supabase-js';

// O ponto de exclamação ! no final diz pro TypeScript: "Pode confiar, essa variável existe"
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);