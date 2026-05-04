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

// ── Prestations ───────────────────────────────────────────────

async function dbGetPrestations() {
  if (!sb) return [];
  const { data, error } = await sb
    .from('prestations')
    .select('*')
    .order('ordre', { ascending: true })
    .order('nom',   { ascending: true });
  if (error) {
    console.error('dbGetPrestations:', error);
    throw error;
  }
  return data || [];
}

async function dbAddPrestation(p) {
  if (!sb) throw new Error('Supabase non initialisé');
  const { data, error } = await sb
    .from('prestations')
    .insert([{
      nom:       p.nom       || '',
      categorie: p.categorie || 'Autres',
      unite:     p.unite     || 'h',
      prix:      Number(p.prix) || 0,
      tags:      p.tags      || '',
      ordre:     Number.isFinite(p.ordre) ? p.ordre : 100
    }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function dbUpdatePrestation(id, p) {
  if (!sb) throw new Error('Supabase non initialisé');
  const { data, error } = await sb
    .from('prestations')
    .update({
      nom:       p.nom       || '',
      categorie: p.categorie || 'Autres',
      unite:     p.unite     || 'h',
      prix:      Number(p.prix) || 0,
      tags:      p.tags      || '',
      ordre:     Number.isFinite(p.ordre) ? p.ordre : 100
    })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function dbDeletePrestation(id) {
  if (!sb) throw new Error('Supabase non initialisé');
  const { error } = await sb.from('prestations').delete().eq('id', id);
  if (error) throw error;
}

// ── Templates ─────────────────────────────────────────────────

async function dbGetTemplates() {
  if (!sb) return [];
  const { data, error } = await sb
    .from('templates')
    .select('*')
    .order('ordre', { ascending: true })
    .order('nom',   { ascending: true });
  if (error) { console.error('dbGetTemplates:', error); throw error; }
  return data || [];
}

async function dbAddTemplate(t) {
  if (!sb) throw new Error('Supabase non initialisé');
  const { data, error } = await sb
    .from('templates')
    .insert([{ nom: t.nom || '', items: t.items || [], ordre: Number.isFinite(t.ordre) ? t.ordre : 100 }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function dbUpdateTemplate(id, t) {
  if (!sb) throw new Error('Supabase non initialisé');
  const { data, error } = await sb
    .from('templates')
    .update({ nom: t.nom || '', items: t.items || [], ordre: Number.isFinite(t.ordre) ? t.ordre : 100 })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function dbDeleteTemplate(id) {
  if (!sb) throw new Error('Supabase non initialisé');
  const { error } = await sb.from('templates').delete().eq('id', id);
  if (error) throw error;
}
