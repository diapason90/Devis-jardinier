// Gestion des clients – format v2 (array, nom + prénom + commentaire)

const CLIENTS_KEY = 'chrisgarden_clients_v2';

function getStoredClients() {
  try {
    return JSON.parse(localStorage.getItem(CLIENTS_KEY) || '[]');
  } catch {
    return [];
  }
}

function _saveClients(list) {
  localStorage.setItem(CLIENTS_KEY, JSON.stringify(list));
}

// Ajoute ou met à jour un client depuis le formulaire principal (nom complet)
function saveClient(nomComplet, adresse, tel) {
  const clients = getStoredClients();
  const existing = clients.find(c => `${c.prenom} ${c.nom}`.trim() === nomComplet.trim() || c.nom === nomComplet.trim());
  if (existing) {
    existing.adresse = validateText(adresse);
    existing.tel     = validateText(tel, 20);
    existing.updated = new Date().toISOString();
  } else {
    clients.push({
      id:          Date.now().toString(),
      nom:         validateText(nomComplet),
      prenom:      '',
      adresse:     validateText(adresse),
      tel:         validateText(tel, 20),
      commentaire: '',
      created:     new Date().toISOString()
    });
  }
  _saveClients(clients);
}

function deleteClient(nom) {
  const clients = getStoredClients().filter(c =>
    `${c.prenom} ${c.nom}`.trim() !== nom && c.nom !== nom
  );
  _saveClients(clients);
  renderClientsList();
}

// Remplit les champs du formulaire principal depuis un client v2
function selectClientById(id) {
  const client = getStoredClients().find(c => c.id === id);
  if (!client) return;

  const nomAffiche = client.prenom
    ? `${client.prenom} ${client.nom}`
    : client.nom;

  document.getElementById('nomClient').value     = nomAffiche;
  document.getElementById('adresseClient').value = client.adresse || '';
  document.getElementById('telClient').value     = client.tel     || '';

  const suggestionsEl = document.getElementById('clientSuggestions');
  if (suggestionsEl) suggestionsEl.classList.remove('active');
}

// Compat : selectClient par nom (utilisé par anciens boutons modal)
function selectClient(nom) {
  const client = getStoredClients().find(c =>
    `${c.prenom} ${c.nom}`.trim() === nom || c.nom === nom
  );
  if (!client) return;
  selectClientById(client.id);
}

// Autocomplete dans le formulaire principal
function showClientSuggestions(query) {
  const suggestionsEl = document.getElementById('clientSuggestions');
  if (!suggestionsEl) return;

  if (!query) {
    suggestionsEl.classList.remove('active');
    suggestionsEl.innerHTML = '';
    return;
  }

  const clients = getStoredClients();
  const q = query.toLowerCase();
  const filtered = clients
    .filter(c => {
      const full = `${c.prenom} ${c.nom} ${c.adresse}`.toLowerCase();
      return full.includes(q);
    })
    .slice(0, 5);

  if (filtered.length === 0) {
    suggestionsEl.innerHTML = '<div class="suggestion-item">Aucun client trouvé</div>';
    suggestionsEl.classList.add('active');
    return;
  }

  suggestionsEl.innerHTML = filtered.map(c => {
    const nomAffiche = c.prenom ? `${sanitizeInput(c.prenom)} ${sanitizeInput(c.nom)}` : sanitizeInput(c.nom);
    return `
      <div class="suggestion-item" onclick="selectClientById('${c.id}')">
        ${nomAffiche}<br>
        <small>${sanitizeInput(c.adresse || '')}</small>
      </div>`;
  }).join('');

  suggestionsEl.classList.add('active');
}

// Modal clients dans la page principale (index.html)
function openClientModal() {
  const modal = document.getElementById('clientModal');
  if (modal) {
    modal.classList.add('active');
    renderClientsList();
  }
}

function closeClientModal() {
  const modal = document.getElementById('clientModal');
  if (modal) modal.classList.remove('active');
}

function renderClientsList() {
  const clientsList = document.getElementById('clientsList');
  if (!clientsList) return;

  const clients = getStoredClients();

  if (clients.length === 0) {
    clientsList.innerHTML = `
      <p style="color: var(--text-muted); text-align:center; padding: 16px 0;">
        Aucun client sauvegardé.<br>
        <a href="clients.html" style="color: var(--primary);">Gérer les clients →</a>
      </p>`;
    return;
  }

  clientsList.innerHTML = clients.map(c => {
    const nomAffiche = c.prenom ? `${sanitizeInput(c.prenom)} ${sanitizeInput(c.nom)}` : sanitizeInput(c.nom);
    return `
      <div class="client-item">
        <div class="client-info">
          <div class="client-name">${nomAffiche}</div>
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
