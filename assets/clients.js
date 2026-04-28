// Cache + autocomplete clients pour la page principale (index.html)
// Source de vérité : Supabase (assets/supabase.js)

let clientsCache = [];

async function refreshClientsCache() {
  if (typeof dbGetClients !== 'function') return;
  try {
    clientsCache = await dbGetClients();
  } catch (err) {
    console.error('refreshClientsCache:', err);
    clientsCache = [];
  }
}

// Charge le cache au démarrage
document.addEventListener('DOMContentLoaded', refreshClientsCache);

function getStoredClients() {
  return clientsCache;
}

// Sauvegarde rapide depuis le formulaire principal (saveDraft → PDF)
async function saveClient(nomComplet, adresse, tel) {
  if (typeof dbAddClient !== 'function') return;
  const existing = clientsCache.find(c =>
    `${c.prenom} ${c.nom}`.trim() === nomComplet.trim() || c.nom === nomComplet.trim()
  );
  try {
    if (existing) {
      await dbUpdateClient(existing.id, {
        nom:         existing.nom,
        prenom:      existing.prenom,
        adresse:     validateText(adresse),
        tel:         validateText(tel, 20),
        commentaire: existing.commentaire || ''
      });
    } else {
      await dbAddClient({
        nom:         validateText(nomComplet),
        prenom:      '',
        adresse:     validateText(adresse),
        tel:         validateText(tel, 20),
        commentaire: ''
      });
    }
    await refreshClientsCache();
  } catch (err) {
    console.error('saveClient:', err);
  }
}

async function deleteClient(nom) {
  const client = clientsCache.find(c =>
    `${c.prenom} ${c.nom}`.trim() === nom || c.nom === nom
  );
  if (!client) return;
  try {
    await dbDeleteClient(client.id);
    await refreshClientsCache();
    renderClientsList();
  } catch (err) {
    console.error('deleteClient:', err);
    alert('Erreur lors de la suppression : ' + (err.message || ''));
  }
}

// Remplit les champs du formulaire principal depuis un client
function selectClientById(id) {
  const client = clientsCache.find(c => c.id === id);
  if (!client) return;
  const nomAffiche = client.prenom ? `${client.prenom} ${client.nom}` : client.nom;
  document.getElementById('nomClient').value     = nomAffiche;
  document.getElementById('adresseClient').value = client.adresse || '';
  document.getElementById('telClient').value     = client.tel     || '';
  document.getElementById('clientSuggestions')?.classList.remove('active');
}

function selectClient(nom) {
  const client = clientsCache.find(c =>
    `${c.prenom} ${c.nom}`.trim() === nom || c.nom === nom
  );
  if (client) selectClientById(client.id);
}

// Autocomplete dans le formulaire principal
function showClientSuggestions(query) {
  const sEl = document.getElementById('clientSuggestions');
  if (!sEl) return;

  if (!query) {
    sEl.classList.remove('active');
    sEl.innerHTML = '';
    return;
  }

  const q = query.toLowerCase();
  const filtered = clientsCache
    .filter(c => `${c.prenom} ${c.nom} ${c.adresse}`.toLowerCase().includes(q))
    .slice(0, 5);

  if (filtered.length === 0) {
    sEl.innerHTML = '<div class="suggestion-item">Aucun client trouvé</div>';
    sEl.classList.add('active');
    return;
  }

  sEl.innerHTML = filtered.map(c => {
    const nom = c.prenom ? `${sanitizeInput(c.prenom)} ${sanitizeInput(c.nom)}` : sanitizeInput(c.nom);
    return `
      <div class="suggestion-item" onclick="selectClientById('${c.id}')">
        ${nom}<br>
        <small>${sanitizeInput(c.adresse || '')}</small>
      </div>`;
  }).join('');
  sEl.classList.add('active');
}

// Modal "clients" dans la page principale
function openClientModal() {
  document.getElementById('clientModal')?.classList.add('active');
  renderClientsList();
}

function closeClientModal() {
  document.getElementById('clientModal')?.classList.remove('active');
}

function renderClientsList() {
  const list = document.getElementById('clientsList');
  if (!list) return;

  if (clientsCache.length === 0) {
    list.innerHTML = `
      <p style="color: var(--text-muted); text-align:center; padding: 16px 0;">
        Aucun client enregistré.<br>
        <a href="clients.html" style="color: var(--primary);">Gérer les clients →</a>
      </p>`;
    return;
  }

  list.innerHTML = clientsCache.map(c => {
    const nom = c.prenom ? `${sanitizeInput(c.prenom)} ${sanitizeInput(c.nom)}` : sanitizeInput(c.nom);
    return `
      <div class="client-item">
        <div class="client-info">
          <div class="client-name">${nom}</div>
          <div class="client-details">${sanitizeInput(c.adresse || '')}</div>
          ${c.tel ? `<div class="client-details">${sanitizeInput(c.tel)}</div>` : ''}
        </div>
        <div class="client-actions">
          <button class="btn-tertiary" onclick="selectClientById('${c.id}'); closeClientModal();">
            Utiliser
          </button>
          <button class="btn-remove" onclick="deleteClient('${sanitizeInput(c.nom)}')">
            Supprimer
          </button>
        </div>
      </div>`;
  }).join('');
}
