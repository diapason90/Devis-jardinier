// ChrisGarden Pro - Logique principale (prestations dynamiques depuis Supabase)

const { jsPDF } = window.jspdf;

const fmt = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const PRICES_KEY = 'chrisgarden_prices';   // Pour le taux km uniquement
const TVA_KEY    = 'chrisgarden_default_tva';

// Liste des prestations chargée depuis Supabase
let PRESTATIONS = [];

// Templates rapides (référencés par nom de prestation pour résister aux changements)
const TEMPLATES = [
  { name: 'Entretien complet',  items: [
      { nom: 'Tonte',                qty: 2.5 },
      { nom: 'Entretien parterres',  qty: 1   },
      { nom: 'Débroussaillage',      qty: 1   }
  ]},
  { name: 'Soin arbres',        items: [
      { nom: 'Élagage',              qty: 3   },
      { nom: 'Taille de haies',      qty: 1   }
  ]},
  { name: 'Nettoyage complet',  items: [
      { nom: 'Karcher / Haute pression', qty: 3 },
      { nom: 'Nettoyage gouttière',      qty: 2 }
  ]}
];

// Icônes par catégorie (mapping figé, défaut = 🌿)
const CATEGORY_ICONS = {
  'Travaux au sol':       '🌱',
  'Taille & Élagage':     '✂️',
  'Services spécialisés': '🔧',
  'Forfaits':             '📦'
};
const DEFAULT_CATEGORY_ICON = '🌿';

function categoryIcon(cat) {
  return CATEGORY_ICONS[cat] || DEFAULT_CATEGORY_ICON;
}

// Libellé d'unité humain
function unitLabel(unite) {
  return ({ h: 'h', min: 'min', unite: 'unité' })[unite] || unite || '';
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

// ============================================
// CHARGEMENT & RENDU DES PRESTATIONS
// ============================================

async function loadPrestations() {
  if (typeof dbGetPrestations !== 'function') return;
  try {
    PRESTATIONS = await dbGetPrestations();
  } catch (err) {
    console.error('loadPrestations:', err);
    PRESTATIONS = [];
  }
}

function renderPrestations() {
  const container = document.getElementById('prestationsContainer');
  if (!container) return;

  if (PRESTATIONS.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding: var(--space-lg);">
        <div class="empty-icon">🌿</div>
        <h3>Aucune prestation</h3>
        <p>Ajoutez vos prestations dans la page <a href="parametres.html" style="color:var(--primary);font-weight:600;">Paramètres</a>.</p>
      </div>`;
    return;
  }

  // Regroupement par catégorie (préserve l'ordre d'apparition)
  const groups = new Map();
  PRESTATIONS.forEach(p => {
    if (!groups.has(p.categorie)) groups.set(p.categorie, []);
    groups.get(p.categorie).push(p);
  });

  let html = '';
  groups.forEach((prests, cat) => {
    html += `
      <div class="prestation-group" data-category="${sanitizeInput(cat)}">
        <div class="group-header">
          <span class="group-icon">${categoryIcon(cat)}</span>
          <h3>${sanitizeInput(cat)}</h3>
          <span class="group-count">0</span>
        </div>
        <div class="prestations-grid">
          ${prests.map(p => `
            <div class="prestation-item">
              <div class="prestation-content">
                <span class="prestation-name">${sanitizeInput(p.nom)}</span>
                <span class="prestation-price">${formatPrice(p.prix)} €/${sanitizeInput(unitLabel(p.unite))}</span>
                ${renderTags(p.tags)}
              </div>
              <input
                type="number"
                class="prestation-qty"
                id="qty-${p.id}"
                data-id="${p.id}"
                min="0"
                step="${p.unite === 'min' ? '5' : '0.5'}"
                value="0"
                onchange="updateTotal()"
                title="Quantité en ${unitLabel(p.unite)}"
              >
            </div>
          `).join('')}
        </div>
      </div>`;
  });

  container.innerHTML = html;
}

function formatPrice(n) {
  const num = Number(n) || 0;
  return num % 1 === 0 ? String(num) : num.toFixed(2).replace(/\.?0+$/, '');
}

function renderTags(tagsCsv) {
  if (!tagsCsv) return '';
  const list = tagsCsv.split(',').map(t => t.trim()).filter(Boolean);
  if (list.length === 0) return '';
  return `<div class="tag-list">${
    list.map(t => `<span class="tag">${sanitizeInput(t)}</span>`).join('')
  }</div>`;
}

// ============================================
// INITIALISATION
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
  loadDefaultTva();
  setupEventListeners();
  await loadPrestations();
  renderPrestations();
  loadDraft();
  updateTotal();
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

  PRESTATIONS.forEach(p => {
    const input = document.getElementById(`qty-${p.id}`);
    if (input) {
      const qty = validateQuantity(input.value);
      input.value = qty;
      subtotal += qty * Number(p.prix || 0);
    }
  });

  document.querySelectorAll('.custom-item').forEach(div => {
    const inputs = div.querySelectorAll('input');
    if (inputs.length >= 3) {
      const price = validatePrice(inputs[1].value);
      const qty   = validateQuantity(inputs[2].value);
      subtotal += price * qty;
    }
  });

  const km = validateQuantity(document.getElementById('km').value);
  subtotal += km * getKmRate();

  const tvaRate   = parseFloat(document.querySelector('input[name="tvaRate"]:checked').value);
  const tvaAmount = subtotal * (tvaRate / 100);
  const total     = subtotal + tvaAmount;

  const sousTotal = document.getElementById('sousTotal');
  const tva       = document.getElementById('tva');
  const totalEl   = document.getElementById('total');

  if (sousTotal) sousTotal.textContent = fmt.format(subtotal);
  if (tva)       tva.textContent       = fmt.format(tvaAmount);
  if (totalEl)   totalEl.textContent   = fmt.format(total);

  updateGroupCounts();
}

function updateGroupCounts() {
  document.querySelectorAll('.prestation-group').forEach(group => {
    let count = 0;
    group.querySelectorAll('.prestation-qty').forEach(input => {
      if ((parseFloat(input.value) || 0) > 0) count++;
    });
    const counter = group.querySelector('.group-count');
    if (counter) counter.textContent = count;
  });
}

// ============================================
// PRESTATIONS PERSONNALISÉES (custom)
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
    <input type="text"   placeholder="Description" maxlength="${MAX_INPUT_LENGTH}" onchange="updateTotal()">
    <input type="number" placeholder="Prix €"      min="0" step="0.01" max="999999" onchange="updateTotal()">
    <input type="number" placeholder="Qté"         min="0" step="0.5"  max="${MAX_QUANTITY}" onchange="updateTotal()">
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
// TEMPLATES (référencés par nom de prestation)
// ============================================

function applyTemplate(idx) {
  if (idx < 0 || idx >= TEMPLATES.length) return;
  const tpl = TEMPLATES[idx];

  // Reset toutes les quantités
  PRESTATIONS.forEach(p => {
    const input = document.getElementById(`qty-${p.id}`);
    if (input) input.value = 0;
  });

  // Applique les items du template (recherche par nom)
  let applied = 0;
  tpl.items.forEach(item => {
    const prest = PRESTATIONS.find(p => p.nom === item.nom);
    if (prest) {
      const input = document.getElementById(`qty-${prest.id}`);
      if (input) { input.value = item.qty; applied++; }
    }
  });

  updateTotal();
  alert(applied === tpl.items.length
    ? `Template « ${tpl.name} » appliqué !`
    : `Template « ${tpl.name} » appliqué partiellement (${applied}/${tpl.items.length} prestations trouvées)`);
}

// ============================================
// SAUVEGARDE & CHARGEMENT (brouillon)
// ============================================

function saveDraft() {
  const data = getData();

  if (!data.nom || !data.adresse) {
    alert("Veuillez remplir au minimum le nom et l'adresse client.");
    return;
  }

  try {
    localStorage.setItem('chrisgarden_draft', JSON.stringify(data));
    // Ajoute le client au carnet d'adresses Supabase si nouveau
    if (typeof saveClient === 'function') {
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

    document.getElementById('nomClient').value     = data.nom     || '';
    document.getElementById('adresseClient').value = data.adresse || '';
    document.getElementById('telClient').value     = data.tel     || '';
    document.getElementById('km').value            = data.km      || '';
  } catch (err) {
    console.error('Erreur chargement:', err);
  }
}

// ============================================
// NUMÉROTATION AUTOMATIQUE
// ============================================

function getNextNumber() {
  const year = new Date().getFullYear();
  const key  = `chrisgarden_num_${year}`;
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
    const pageWidth  = doc.internal.pageSize.getWidth();
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

    // Tableau
    doc.setFontSize(10);
    doc.text('Description', 10, y);
    doc.text('Qté',         100, y);
    doc.text('Prix',        130, y);
    doc.text('Total',       160, y);
    y += 5;

    let subtotal = 0;

    PRESTATIONS.forEach(p => {
      const input = document.getElementById(`qty-${p.id}`);
      const qty = input ? validateQuantity(input.value) : 0;
      if (qty > 0) {
        const totalItem = qty * Number(p.prix || 0);
        doc.text(sanitizeInput(p.nom), 10, y);
        doc.text(`${qty} ${unitLabel(p.unite)}`, 100, y);
        doc.text(fmt.format(p.prix), 130, y);
        doc.text(fmt.format(totalItem), 160, y);
        subtotal += totalItem;
        y += 5;
      }
    });

    document.querySelectorAll('.custom-item').forEach(div => {
      const inputs = div.querySelectorAll('input');
      if (inputs.length >= 3) {
        const desc  = validateText(inputs[0].value);
        const price = validatePrice(inputs[1].value);
        const qty   = validateQuantity(inputs[2].value);
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
      doc.text(`${data.km} km`, 100, y);
      doc.text(fmt.format(kmRate), 130, y);
      doc.text(fmt.format(totalKm), 160, y);
      subtotal += totalKm;
      y += 5;
    }

    const tvaAmount = subtotal * (data.tvaRate / 100);
    const totalTTC  = subtotal + tvaAmount;

    y += 5;
    doc.setFontSize(11);
    doc.text(`Sous-total : ${fmt.format(subtotal)}`, 10, y); y += 5;
    doc.text(`TVA (${data.tvaRate}%) : ${fmt.format(tvaAmount)}`, 10, y); y += 5;
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(`TOTAL TTC : ${fmt.format(totalTTC)}`, 10, y);

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
    let csv = 'Description;Quantité;Unité;Prix unitaire;Total\n';

    PRESTATIONS.forEach(p => {
      const input = document.getElementById(`qty-${p.id}`);
      const qty = input ? validateQuantity(input.value) : 0;
      if (qty > 0) {
        csv += `"${p.nom}";${qty};"${unitLabel(p.unite)}";"${p.prix} €";"${qty * Number(p.prix || 0)} €"\n`;
      }
    });

    document.querySelectorAll('.custom-item').forEach(div => {
      const inputs = div.querySelectorAll('input');
      if (inputs.length >= 3) {
        const desc  = validateText(inputs[0].value);
        const price = validatePrice(inputs[1].value);
        const qty   = validateQuantity(inputs[2].value);
        if (desc && price && qty) {
          csv += `"${desc}";${qty};"";"${price} €";"${price * qty} €"\n`;
        }
      }
    });

    csv += '\n';
    csv += `Sous-total;;;;${document.getElementById('sousTotal')?.textContent || '0,00 €'}\n`;
    csv += `TVA;;;;${document.getElementById('tva')?.textContent || '0,00 €'}\n`;
    csv += `Total TTC;;;;${document.getElementById('total')?.textContent || '0,00 €'}\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const year = new Date().getFullYear();
    const num  = String(parseInt(localStorage.getItem(`chrisgarden_num_${year}`) || 0)).padStart(3, '0');

    link.setAttribute('href', URL.createObjectURL(blob));
    link.setAttribute('download', `export_${year}-${num}_${data.nom.replace(/\s+/g, '_')}.csv`);
    link.click();
  } catch (err) {
    console.error('Erreur CSV:', err);
    alert("Erreur lors de l'export CSV.");
  }
}
