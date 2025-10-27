//
// Script principal pour ChrisGarden
// Gère le chargement des prestations, le calcul des totaux, la sauvegarde locale
// et la génération du PDF via jsPDF. Le numérotage se base sur l'année en cours.

const { jsPDF } = window.jspdf;

// Format monétaire français en euros
const fmt = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });

// Catalogue des prestations avec tarif et unité
const PRESTATIONS = [
  { name: 'Tonte', price: 20, unit: 'h' },
  { name: 'Débroussaillage', price: 20, unit: 'h' },
  { name: 'Taille de haies', price: 24, unit: 'h' },
  { name: 'Élagage', price: 30, unit: 'h' },
  { name: 'Entretien parterres', price: 22, unit: 'h' },
  { name: 'Nettoyage gouttière', price: 26, unit: 'h' },
  { name: 'Karcher / Haute pression', price: 24, unit: 'h' },
  { name: 'Ramassage / évacuation déchets', price: 20, unit: 'remorque' },
  { name: 'Plantation arbustes / arbres', price: 25, unit: 'h' },
  { name: 'Scarification pelouse', price: 24, unit: 'h' },
  // Prestations supplémentaires
  { name: 'Forfait journalier', price: 160, unit: 'jour' },
  { name: 'Location machine unitaire', price: 50, unit: 'unité' }
];

// Chargement initial des prestations et des données sauvegardées
document.addEventListener('DOMContentLoaded', () => {
  loadPrestations();
  loadDraft();
  updateTotal();
  // Mettre à jour les totaux quand on change le taux de TVA
  document.querySelectorAll('input[name="tvaRate"]').forEach(radio => {
    radio.addEventListener('change', updateTotal);
  });
});

// Crée la liste des entrées pour chaque prestation de base
function loadPrestations() {
  const list = document.getElementById('prestationList');
  PRESTATIONS.forEach((p, i) => {
    const div = document.createElement('div');
    div.className = 'prestation-item';
    div.innerHTML = `
      <label>${p.name} (${fmt.format(p.price)} / ${p.unit})</label>
      <input type="number" id="qty-${i}" min="0" step="0.5" value="0" onchange="updateTotal()">
    `;
    list.appendChild(div);
  });
}

// Ajoute une prestation personnalisée (description, prix, quantité)
function addCustom() {
  const list = document.getElementById('prestationList');
  const div = document.createElement('div');
  div.className = 'prestation-item custom';
  div.innerHTML = `
    <input type="text" placeholder="Description" onchange="updateTotal()">
    <input type="number" placeholder="Prix (€)" min="0" step="0.01" onchange="updateTotal()">
    <input type="number" placeholder="Qté" min="0" step="0.5" onchange="updateTotal()">
  `;
  list.appendChild(div);
}

// Calcule et affiche le sous-total, la TVA et le total TTC
function updateTotal() {
  let subtotal = 0;
  // Prestations de base
  PRESTATIONS.forEach((p, i) => {
    const qty = parseFloat(document.getElementById(`qty-${i}`).value) || 0;
    subtotal += qty * p.price;
  });
  // Prestations personnalisées
  document.querySelectorAll('.prestation-item.custom').forEach(div => {
    const inputs = div.querySelectorAll('input');
    if (inputs.length === 3) {
      const price = parseFloat(inputs[1].value) || 0;
      const qty = parseFloat(inputs[2].value) || 0;
      subtotal += price * qty;
    }
  });
  // Frais de déplacement
  const km = parseFloat(document.getElementById('km').value) || 0;
  subtotal += km * 0.25;
  // TVA
  const tvaRate = parseFloat(document.querySelector('input[name="tvaRate"]:checked').value);
  const tvaAmount = subtotal * (tvaRate / 100);
  const total = subtotal + tvaAmount;
  // Affichage
  document.getElementById('sousTotal').textContent = fmt.format(subtotal);
  document.getElementById('tva').textContent = fmt.format(tvaAmount);
  document.getElementById('total').textContent = fmt.format(total);
}

// Récupère les données du formulaire pour sauvegarde ou génération du PDF
function getData() {
  return {
    type: document.querySelector('input[name="docType"]:checked').value,
    tvaRate: parseFloat(document.querySelector('input[name="tvaRate"]:checked').value),
    nom: document.getElementById('nomClient').value.trim(),
    adresse: document.getElementById('adresseClient').value.trim(),
    tel: document.getElementById('telClient').value.trim(),
    km: parseFloat(document.getElementById('km').value) || 0
  };
}

// Sauvegarde le dernier devis/facture dans le localStorage
function saveDraft() {
  const data = getData();
  localStorage.setItem('chrisgarden_draft', JSON.stringify(data));
  alert('Dernier document sauvegardé');
}

// Recharge les données sauvegardées, si elles existent
function loadDraft() {
  const draft = localStorage.getItem('chrisgarden_draft');
  if (!draft) return;
  const data = JSON.parse(draft);
  // Remplissage des champs
  if (data.type) {
    const typeRadio = document.querySelector(`input[name="docType"][value="${data.type}"]`);
    if (typeRadio) typeRadio.checked = true;
  }
  if (!isNaN(data.tvaRate)) {
    const tvaRadio = document.querySelector(`input[name="tvaRate"][value="${data.tvaRate}"]`);
    if (tvaRadio) tvaRadio.checked = true;
  }
  document.getElementById('nomClient').value = data.nom || '';
  document.getElementById('adresseClient').value = data.adresse || '';
  document.getElementById('telClient').value = data.tel || '';
  document.getElementById('km').value = data.km || '';
}

// Gère le numérotage automatique par année
function getNextNumber() {
  const year = new Date().getFullYear();
  const key = `chrisgarden_num_${year}`;
  let last = parseInt(localStorage.getItem(key) || '0', 10) + 1;
  localStorage.setItem(key, last);
  return `${year}-${String(last).padStart(3, '0')}`;
}

// Génère le PDF à partir des données saisies
function generatePDF() {
  const data = getData();
  // Vérification des champs obligatoires
  if (!data.nom || !data.adresse) {
    alert('Veuillez remplir les informations client.');
    return;
  }
  // Numéro automatique
  const num = getNextNumber();
  const doc = new jsPDF();
  // Bandeau vert en haut du PDF
  doc.setFillColor(21, 128, 61);
  doc.rect(0, 0, 210, 15, 'F');
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text('ChrisGarden', 10, 11);
  doc.setFontSize(9);
  doc.text(`${data.type.toUpperCase()} n°${num}`, 150, 11);
  // Retour à la couleur noire pour le corps du document
  doc.setTextColor(0, 0, 0);
  let y = 25;
  doc.setFontSize(12);
  doc.text(`Client : ${data.nom}`, 10, y);
  y += 6;
  doc.text(`Adresse : ${data.adresse}`, 10, y);
  y += 6;
  if (data.tel) {
    doc.text(`Téléphone : ${data.tel}`, 10, y);
    y += 6;
  }
  doc.text(`Date : ${new Date().toLocaleDateString('fr-FR')}`, 10, y);
  y += 10;
  // Table des prestations
  doc.setFontSize(10);
  doc.text('Description', 10, y);
  doc.text('Qté', 100, y);
  doc.text('Prix', 130, y);
  doc.text('Total', 160, y);
  y += 5;
  let subtotal = 0;
  // Prestations de base
  PRESTATIONS.forEach((p, i) => {
    const qty = parseFloat(document.getElementById(`qty-${i}`).value) || 0;
    if (qty > 0) {
      const totalItem = qty * p.price;
      doc.text(p.name, 10, y);
      doc.text(qty.toString(), 100, y);
      doc.text(fmt.format(p.price), 130, y);
      doc.text(fmt.format(totalItem), 160, y);
      subtotal += totalItem;
      y += 5;
    }
  });
  // Prestations personnalisées
  document.querySelectorAll('.prestation-item.custom').forEach(div => {
    const inputs = div.querySelectorAll('input');
    if (inputs.length === 3) {
      const desc = inputs[0].value.trim();
      const price = parseFloat(inputs[1].value) || 0;
      const qty = parseFloat(inputs[2].value) || 0;
      if (desc && price && qty) {
        const totalItem = price * qty;
        doc.text(desc, 10, y);
        doc.text(qty.toString(), 100, y);
        doc.text(fmt.format(price), 130, y);
        doc.text(fmt.format(totalItem), 160, y);
        subtotal += totalItem;
        y += 5;
      }
    }
  });
  // Frais de déplacement
  if (data.km > 0) {
    const totalKm = data.km * 0.25;
    doc.text('Frais kilométriques', 10, y);
    doc.text(data.km.toString(), 100, y);
    doc.text(fmt.format(0.25), 130, y);
    doc.text(fmt.format(totalKm), 160, y);
    subtotal += totalKm;
    y += 5;
  }
  // Résumé des montants
  const tvaAmount = subtotal * (data.tvaRate / 100);
  const totalTTC = subtotal + tvaAmount;
  y += 5;
  doc.text(`Sous-total : ${fmt.format(subtotal)}`, 10, y);
  y += 5;
  doc.text(`TVA (${data.tvaRate}%) : ${fmt.format(tvaAmount)}`, 10, y);
  y += 5;
  doc.text(`TOTAL TTC : ${fmt.format(totalTTC)}`, 10, y);
  y += 10;
  // Signature
  doc.text('Signature : Christophe', 10, y);
  // Sauvegarde du PDF
  const filename = `${data.type}_${num}_${data.nom.replace(/\s+/g, '_')}.pdf`;
  doc.save(filename);
}