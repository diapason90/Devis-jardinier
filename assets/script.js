// ChrisGarden Pro - Logique principale

const { jsPDF } = window.jspdf;

const fmt = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const PRICES_KEY   = 'chrisgarden_prices';
const TVA_KEY      = 'chrisgarden_default_tva';

// Prix de référence (surchargés par les paramètres)
const PRESTATIONS = [
  { name: 'Tonte',                          price: 20,  unit: 'h'        },
  { name: 'Débroussaillage',                price: 20,  unit: 'h'        },
  { name: 'Taille de haies',               price: 24,  unit: 'h'        },
  { name: 'Élagage',                        price: 30,  unit: 'h'        },
  { name: 'Entretien parterres',            price: 22,  unit: 'h'        },
  { name: 'Nettoyage gouttière',            price: 26,  unit: 'h'        },
  { name: 'Karcher / Haute pression',       price: 24,  unit: 'h'        },
  { name: 'Ramassage / évacuation déchets', price: 20,  unit: 'remorque' },
  { name: 'Plantation arbustes / arbres',   price: 25,  unit: 'h'        },
  { name: 'Scarification pelouse',          price: 24,  unit: 'h'        },
  { name: 'Forfait journalier',             price: 160, unit: 'jour'     },
  { name: 'Location machine unitaire',      price: 50,  unit: 'unité'    },
];

// Applique les prix personnalisés depuis localStorage
function loadCustomPrices() {
  try {
    const stored = JSON.parse(localStorage.getItem(PRICES_KEY) || '{}');
    PRESTATIONS.forEach((p, i) => {
      if (stored[i] !== undefined) p.price = stored[i];
    });
    // Taux km stocké séparément, lu dans updateTotal()
  } catch { /* garde les prix par défaut */ }
}

function getKmRate() {
  try {
    const stored = JSON.parse(localStorage.getItem(PRICES_KEY) || '{}');
    return stored['km'] !== undefined ? stored['km'] : 0.25;
  } catch { return 0.25; }
}

// Charge la TVA par défaut définie dans les paramètres
function loadDefaultTva() {
  const tva = localStorage.getItem(TVA_KEY);
  if (tva !== null) {
    const radio = document.querySelector(`input[name="tvaRate"][value="${tva}"]`);
    if (radio) radio.checked = true;
  }
}

const TEMPLATES = [
  {
    name: 'Entretien complet',
    items: [
      { idx: 0, qty: 2.5 },
      { idx: 4, qty: 1 },
      { idx: 1, qty: 1 }
    ]
  },
  {
    name: 'Soin arbres',
    items: [
      { idx: 3, qty: 3 },
      { idx: 2, qty: 1 }
    ]
  },
  {
    name: 'Nettoyage complet',
    items: [
      { idx: 6, qty: 3 },
      { idx: 5, qty: 2 }
    ]
  }
];

// ============================================
// INITIALISATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  loadCustomPrices();
  loadDefaultTva();
  loadDraft();
  setupEventListeners();
  updateTotal();
  updateGroupCounts();
});

function setupEventListeners() {
  document.querySelectorAll('input[name="tvaRate"]').forEach(radio => {
    radio.addEventListener('change', () => {
      updateTVALabel();
      updateTotal();
    });
  });

  const nomClient = document.getElementById('nomClient');
  if (nomClient) {
    nomClient.addEventListener('input', (e) => showClientSuggestions(e.target.value));
    nomClient.addEventListener('blur', () => {
      setTimeout(() => {
        const suggestions = document.getElementById('clientSuggestions');
        if (suggestions) suggestions.classList.remove('active');
      }, 200);
    });
  }

  const modal = document.getElementById('clientModal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeClientModal();
    });
  }

  // Barre quick-nav (Documents / Clients / Templates / Export)
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const section = btn.dataset.section;

      if (section === 'clients') {
        window.location.href = 'clients.html';
        return;
      }

      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      if (section === 'form') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (section === 'templates') {
        document.querySelector('.templates-bar')
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (section === 'export') {
        exportCSV();
      }
    });
  });
}

function updateTVALabel() {
  const tvaRate = parseFloat(document.querySelector('input[name="tvaRate"]:checked').value);
  const tvaLabel = document.getElementById('tvaLabel');
  if (tvaLabel) tvaLabel.textContent = `TVA (${tvaRate} %)`;
}

// ============================================
// CALCUL DES TOTAUX
// ============================================

function updateTotal() {
  let subtotal = 0;

  PRESTATIONS.forEach((p, i) => {
    const input = document.getElementById(`qty-${i}`);
    if (input) {
      const qty = validateQuantity(input.value);
      input.value = qty;
      subtotal += qty * p.price;
    }
  });

  document.querySelectorAll('.custom-item').forEach(div => {
    const inputs = div.querySelectorAll('input');
    if (inputs.length >= 2) {
      const price = validatePrice(inputs[1].value);
      const qty = validateQuantity(inputs[2].value);
      subtotal += price * qty;
    }
  });

  const km = validateQuantity(document.getElementById('km').value);
  subtotal += km * getKmRate();

  const tvaRate = parseFloat(document.querySelector('input[name="tvaRate"]:checked').value);
  const tvaAmount = subtotal * (tvaRate / 100);
  const total = subtotal + tvaAmount;

  const sousTotal = document.getElementById('sousTotal');
  const tva = document.getElementById('tva');
  const totalEl = document.getElementById('total');

  if (sousTotal) sousTotal.textContent = fmt.format(subtotal);
  if (tva) tva.textContent = fmt.format(tvaAmount);
  if (totalEl) totalEl.textContent = fmt.format(total);

  updateGroupCounts();
}

function updateGroupCounts() {
  const getQty = (idx) => parseFloat(document.getElementById(`qty-${idx}`)?.value) || 0;

  const counts = {
    sol:     [0, 1, 9].filter(i => getQty(i) > 0).length,
    taille:  [2, 3, 4].filter(i => getQty(i) > 0).length,
    special: [5, 6, 7, 8].filter(i => getQty(i) > 0).length,
    forfait: [10, 11].filter(i => getQty(i) > 0).length
  };

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('count-sol', counts.sol);
  set('count-taille', counts.taille);
  set('count-special', counts.special);
  set('count-forfait', counts.forfait);
}

// ============================================
// PRESTATIONS PERSONNALISÉES
// ============================================

function addCustom() {
  const customList = document.getElementById('customList');
  const count = document.querySelectorAll('.custom-item').length;

  if (count >= MAX_CUSTOM_ITEMS) {
    alert(`Maximum ${MAX_CUSTOM_ITEMS} prestations personnalisées autorisées`);
    return;
  }

  const div = document.createElement('div');
  div.className = 'custom-item';
  div.innerHTML = `
    <input type="text" placeholder="Description" maxlength="${MAX_INPUT_LENGTH}" onchange="updateTotal()">
    <input type="number" placeholder="Prix €" min="0" step="0.01" max="999999" onchange="updateTotal()">
    <input type="number" placeholder="Qté" min="0" step="0.5" max="${MAX_QUANTITY}" onchange="updateTotal()">
    <button class="btn-remove" onclick="removeCustom(this)" title="Supprimer">
      <i class="fas fa-trash"></i>
    </button>
  `;

  customList.appendChild(div);
  updateTotal();
}

function removeCustom(btn) {
  btn.parentElement.remove();
  updateTotal();
}

// ============================================
// TEMPLATES
// ============================================

function applyTemplate(templateIndex) {
  if (templateIndex < 0 || templateIndex >= TEMPLATES.length) return;

  const template = TEMPLATES[templateIndex];

  PRESTATIONS.forEach((_, i) => {
    const input = document.getElementById(`qty-${i}`);
    if (input) input.value = 0;
  });

  template.items.forEach(({ idx, qty }) => {
    const input = document.getElementById(`qty-${idx}`);
    if (input) input.value = qty;
  });

  updateTotal();
  alert(`Template "${template.name}" appliqué !`);
}

// ============================================
// SAUVEGARDE & CHARGEMENT
// ============================================

function saveDraft() {
  const data = getData();

  if (!data.nom || !data.adresse) {
    alert("Veuillez remplir au minimum le nom et l'adresse client.");
    return;
  }

  try {
    localStorage.setItem('chrisgarden_draft', JSON.stringify(data));

    const clients = getStoredClients();
    if (!clients[data.nom]) {
      saveClient(data.nom, data.adresse, data.tel);
    }

    alert('Document sauvegardé !');
  } catch (err) {
    console.error('Erreur sauvegarde:', err);
    alert('Erreur lors de la sauvegarde.');
  }
}

function loadDraft() {
  try {
    const draft = localStorage.getItem('chrisgarden_draft');
    if (!draft) return;

    const data = JSON.parse(draft);

    const typeRadio = document.querySelector(`input[name="docType"][value="${data.type}"]`);
    if (typeRadio) typeRadio.checked = true;

    const tvaRadio = document.querySelector(`input[name="tvaRate"][value="${data.tvaRate}"]`);
    if (tvaRadio) tvaRadio.checked = true;

    document.getElementById('nomClient').value = data.nom || '';
    document.getElementById('adresseClient').value = data.adresse || '';
    document.getElementById('telClient').value = data.tel || '';
    document.getElementById('km').value = data.km || '';
  } catch (err) {
    console.error('Erreur chargement:', err);
  }
}

// ============================================
// NUMÉROTATION AUTOMATIQUE
// ============================================

function getNextNumber() {
  const year = new Date().getFullYear();
  const key = `chrisgarden_num_${year}`;
  const last = parseInt(localStorage.getItem(key) || '0', 10) + 1;
  localStorage.setItem(key, last);
  return `${year}-${String(last).padStart(3, '0')}`;
}

// ============================================
// GÉNÉRATION PDF
// ============================================

function generatePDF() {
  try {
    const data = getData();

    if (!data.nom || !data.adresse) {
      alert('Veuillez remplir les informations client.');
      return;
    }

    const num = getNextNumber();
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Header
    doc.setFillColor(21, 128, 61);
    doc.rect(0, 0, pageWidth, 20, 'F');
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text('ChrisGarden', 10, 14);
    doc.setFontSize(10);
    doc.text(`${data.type.toUpperCase()} n°${num}`, pageWidth - 40, 14);
    doc.setTextColor(0, 0, 0);

    let y = 30;

    // Infos client
    doc.setFontSize(12);
    doc.text(`Client : ${sanitizeInput(data.nom)}`, 10, y); y += 6;
    doc.text(`Adresse : ${sanitizeInput(data.adresse)}`, 10, y); y += 6;
    if (data.tel) { doc.text(`Téléphone : ${sanitizeInput(data.tel)}`, 10, y); y += 6; }
    doc.text(`Date : ${new Date().toLocaleDateString('fr-FR')}`, 10, y); y += 10;

    // En-tête tableau
    doc.setFontSize(10);
    doc.text('Description', 10, y);
    doc.text('Qté', 100, y);
    doc.text('Prix', 130, y);
    doc.text('Total', 160, y);
    y += 5;

    let subtotal = 0;

    PRESTATIONS.forEach((p, i) => {
      const input = document.getElementById(`qty-${i}`);
      const qty = input ? validateQuantity(input.value) : 0;
      if (qty > 0) {
        const totalItem = qty * p.price;
        doc.text(sanitizeInput(p.name), 10, y);
        doc.text(qty.toString(), 100, y);
        doc.text(fmt.format(p.price), 130, y);
        doc.text(fmt.format(totalItem), 160, y);
        subtotal += totalItem;
        y += 5;
      }
    });

    document.querySelectorAll('.custom-item').forEach(div => {
      const inputs = div.querySelectorAll('input');
      if (inputs.length >= 3) {
        const desc = validateText(inputs[0].value);
        const price = validatePrice(inputs[1].value);
        const qty = validateQuantity(inputs[2].value);
        if (desc && price && qty) {
          const totalItem = price * qty;
          doc.text(sanitizeInput(desc), 10, y);
          doc.text(qty.toString(), 100, y);
          doc.text(fmt.format(price), 130, y);
          doc.text(fmt.format(totalItem), 160, y);
          subtotal += totalItem;
          y += 5;
        }
      }
    });

    if (data.km > 0) {
      const kmRate  = getKmRate();
      const totalKm = data.km * kmRate;
      doc.text('Frais kilométriques', 10, y);
      doc.text(data.km.toString(), 100, y);
      doc.text(fmt.format(kmRate), 130, y);
      doc.text(fmt.format(totalKm), 160, y);
      subtotal += totalKm;
      y += 5;
    }

    // Résumé
    const tvaAmount = subtotal * (data.tvaRate / 100);
    const totalTTC = subtotal + tvaAmount;

    y += 5;
    doc.setFontSize(11);
    doc.text(`Sous-total : ${fmt.format(subtotal)}`, 10, y); y += 5;
    doc.text(`TVA (${data.tvaRate}%) : ${fmt.format(tvaAmount)}`, 10, y); y += 5;
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(`TOTAL TTC : ${fmt.format(totalTTC)}`, 10, y);

    // Signature
    y = pageHeight - 20;
    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    doc.text('Signature : Christophe', 10, y);

    const filename = `${data.type}_${num}_${sanitizeInput(data.nom).replace(/\s+/g, '_')}.pdf`;
    doc.save(filename);
  } catch (err) {
    console.error('Erreur PDF:', err);
    alert('Erreur lors de la génération du PDF.');
  }
}

// ============================================
// EXPORT CSV
// ============================================

function exportCSV() {
  try {
    const data = getData();
    let csv = 'Description;Quantité;Prix unitaire;Total\n';

    PRESTATIONS.forEach((p, i) => {
      const input = document.getElementById(`qty-${i}`);
      const qty = input ? validateQuantity(input.value) : 0;
      if (qty > 0) {
        csv += `"${p.name}";${qty};"${p.price} €";"${qty * p.price} €"\n`;
      }
    });

    document.querySelectorAll('.custom-item').forEach(div => {
      const inputs = div.querySelectorAll('input');
      if (inputs.length >= 3) {
        const desc = validateText(inputs[0].value);
        const price = validatePrice(inputs[1].value);
        const qty = validateQuantity(inputs[2].value);
        if (desc && price && qty) {
          csv += `"${desc}";${qty};"${price} €";"${price * qty} €"\n`;
        }
      }
    });

    csv += '\n';
    csv += `Sous-total;;;;;${document.getElementById('sousTotal')?.textContent || '0,00 €'}\n`;
    csv += `TVA;;;;;${document.getElementById('tva')?.textContent || '0,00 €'}\n`;
    csv += `Total TTC;;;;;${document.getElementById('total')?.textContent || '0,00 €'}\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const year = new Date().getFullYear();
    const num = String(parseInt(localStorage.getItem(`chrisgarden_num_${year}`) || 0)).padStart(3, '0');

    link.setAttribute('href', URL.createObjectURL(blob));
    link.setAttribute('download', `export_${year}-${num}_${data.nom.replace(/\s+/g, '_')}.csv`);
    link.click();
  } catch (err) {
    console.error('Erreur CSV:', err);
    alert("Erreur lors de l'export CSV.");
  }
}
