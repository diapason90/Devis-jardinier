// Connexion Supabase + helpers CRUD pour les clients

const SUPABASE_URL = 'https://mpgzcakxtmskpbmymbed.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Zhudjgpkv1jCNJKl6sdrRg_mMN53k2V';

let sb = null;
if (window.supabase && typeof window.supabase.createClient === 'function') {
  sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
} else {
  console.error('Supabase JS non chargé. Vérifie le <script src="...supabase-js@2"></script>');
}

// ── Helpers CRUD ──────────────────────────────────────────────

async function dbGetClients() {
  if (!sb) return [];
  const { data, error } = await sb
    .from('clients')
    .select('*')
    .order('nom', { ascending: true })
    .order('prenom', { ascending: true });
  if (error) {
    console.error('dbGetClients:', error);
    throw error;
  }
  return data || [];
}

async function dbAddClient(c) {
  if (!sb) throw new Error('Supabase non initialisé');
  const { data, error } = await sb
    .from('clients')
    .insert([{
      nom:         c.nom         || '',
      prenom:      c.prenom      || '',
      adresse:     c.adresse     || '',
      tel:         c.tel         || '',
      commentaire: c.commentaire || ''
    }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function dbUpdateClient(id, c) {
  if (!sb) throw new Error('Supabase non initialisé');
  const { data, error } = await sb
    .from('clients')
    .update({
      nom:         c.nom         || '',
      prenom:      c.prenom      || '',
      adresse:     c.adresse     || '',
      tel:         c.tel         || '',
      commentaire: c.commentaire || '',
      updated_at:  new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function dbDeleteClient(id) {
  if (!sb) throw new Error('Supabase non initialisé');
  const { error } = await sb.from('clients').delete().eq('id', id);
  if (error) throw error;
}
