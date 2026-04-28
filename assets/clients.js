// Gestion des clients (localStorage + autocomplete)

function getStoredClients() {
  try {
    const data = localStorage.getItem('chrisgarden_clients');
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

function saveClient(nom, adresse, tel) {
  const clients = getStoredClients();
  clients[validateText(nom)] = {
    adresse: validateText(adresse),
    tel: validateText(tel, 20),
    created: new Date().toISOString()
  };
  localStorage.setItem('chrisgarden_clients', JSON.stringify(clients));
}

function deleteClient(nom) {
  if (!confirm(`Supprimer le client "${sanitizeInput(nom)}" ?`)) return;
  const clients = getStoredClients();
  delete clients[nom];
  localStorage.setItem('chrisgarden_clients', JSON.stringify(clients));
  renderClientsList();
}

function selectClient(nom) {
  const clients = getStoredClients();
  const client = clients[nom];
  if (!client) return;

  document.getElementById('nomClient').value = nom;
  document.getElementById('adresseClient').value = client.adresse;
  document.getElementById('telClient').value = client.tel || '';

  const suggestionsEl = document.getElementById('clientSuggestions');
  if (suggestionsEl) suggestionsEl.classList.remove('active');
}

function showClientSuggestions(query) {
  const suggestionsEl = document.getElementById('clientSuggestions');
  if (!suggestionsEl) return;

  if (!query) {
    suggestionsEl.classList.remove('active');
    suggestionsEl.innerHTML = '';
    return;
  }

  const clients = getStoredClients();
  const filtered = Object.keys(clients)
    .filter(name => name.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 5);

  if (filtered.length === 0) {
    suggestionsEl.innerHTML = '<div class="suggestion-item">Aucun client trouvé</div>';
    suggestionsEl.classList.add('active');
    return;
  }

  suggestionsEl.innerHTML = filtered
    .map(name => `
      <div class="suggestion-item" onclick="selectClient('${sanitizeInput(name)}')">
        ${sanitizeInput(name)}<br>
        <small>${sanitizeInput(clients[name].adresse)}</small>
      </div>
    `)
    .join('');

  suggestionsEl.classList.add('active');
}

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
  const clients = getStoredClients();

  if (Object.keys(clients).length === 0) {
    clientsList.innerHTML = '<p style="color: var(--text-muted);">Aucun client sauvegardé</p>';
    return;
  }

  clientsList.innerHTML = Object.entries(clients)
    .map(([nom, data]) => `
      <div class="client-item">
        <div class="client-info">
          <div class="client-name">${sanitizeInput(nom)}</div>
          <div class="client-details">${sanitizeInput(data.adresse)}</div>
          ${data.tel ? `<div class="client-details">${sanitizeInput(data.tel)}</div>` : ''}
        </div>
        <div class="client-actions">
          <button class="btn-tertiary" onclick="selectClient('${sanitizeInput(nom)}'); closeClientModal();">Utiliser</button>
          <button class="btn-remove" onclick="deleteClient('${sanitizeInput(nom)}')">Supprimer</button>
        </div>
      </div>
    `)
    .join('');
}
