const { jsPDF } = window.jspdf;
const fmt = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });

const PRESTATIONS = [
  { name: 'Tonte', price: 20 },
  { name: 'Débroussaillage', price: 20 },
  { name: 'Taille de haies', price: 24 },
  { name: 'Nettoyage gouttière', price: 26 },
  { name: 'Karcher / Haute pression', price: 24 }
];

document.addEventListener('DOMContentLoaded', () => {
  loadPrestations();
  loadDraft();
  updateTotal();
});

function loadPrestations() {
  const list = document.getElementById('prestationList');
  PRESTATIONS.forEach((p, i) => {
    const div = document.createElement('div');
    div.className = 'prestation';
    div.innerHTML = `
      <label>${p.name} (${fmt.format(p.price)}/h)</label>
      <input type="number" id="qty${i}" min="0" step="0.5" onchange="updateTotal()">
    `;
    list.appendChild(div);
  });
}

function addCustom() {
  const list = document.getElementById('prestationList');
  const div = document.createElement('div');
  div.className = 'prestation';
  div.innerHTML = `
    <input type="text" placeholder="Description" onchange="updateTotal()">
    <input type="number" placeholder="Prix €" min="0" step="0.01" onchange="updateTotal()">
    <input type="number" placeholder="Qté" min="0" step="0.5" onchange="updateTotal()">
  `;
  list.appendChild(div);
}

function updateTotal() {
  let total = 0;
  PRESTATIONS.forEach((p, i) => {
    const qty = parseFloat(document.getElementById(`qty${i}`).value) || 0;
    total += qty * p.price;
  });

  document.querySelectorAll('.prestation').forEach(div => {
    const inputs = div.querySelectorAll('input');
    if (inputs.length === 3) {
      const [desc, price, qty] = inputs;
      total += (parseFloat(price.value) || 0) * (parseFloat(qty.value) || 0);
    }
  });

  const km = parseFloat(document.getElementById('km').value) || 0;
  total += km * 0.25;

  const tvaAmount = total * 0.21;
  document.getElementById('sousTotal').textContent = fmt.format(total);
  document.getElementById('tva').textContent = fmt.format(tvaAmount);
  document.getElementById('total').textContent = fmt.format(total + tvaAmount);
}

function saveDraft() {
  const data = getData();
  localStorage.setItem('draft', JSON.stringify(data));
  alert('Dernier devis sauvegardé');
}

function loadDraft() {
  const draft = localStorage.getItem('draft');
  if (!draft) return;
  const data = JSON.parse(draft);
  document.querySelector(`input[value="${data.type}"]`).checked = true;
  document.getElementById('nomClient').value = data.nom;
  document.getElementById('adresseClient').value = data.adresse;
  document.getElementById('telClient').value = data.tel;
  document.getElementById('km').value = data.km;
}

function getNextNumber() {
  const last = parseInt(localStorage.getItem('docNumber') || '0') + 1;
  localStorage.setItem('docNumber', last);
  const year = new Date().getFullYear();
  return `${year}-${String(last).padStart(3, '0')}`;
}

function getData() {
  return {
    type: document.querySelector('input[name="docType"]:checked').value,
    nom: document.getElementById('nomClient').value,
    adresse: document.getElementById('adresseClient').value,
    tel: document.getElementById('telClient').value,
    km: parseFloat(document.getElementById('km').value) || 0
  };
}

function generatePDF() {
  const data = getData();
  if (!data.nom || !data.adresse) {
    alert('Veuillez remplir les informations client.');
    return;
  }

  const num = getNextNumber();
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(`Jardinier Christophe`, 20, 20);
  doc.setFontSize(12);
  doc.text(`${data.type.toUpperCase()} n°${num}`, 20, 30);
  doc.text(`Date : ${new Date().toLocaleDateString('fr-FR')}`, 20, 38);

  doc.text(`Client : ${data.nom}`, 20, 50);
  doc.text(`Adresse : ${data.adresse}`, 20, 58);
  if (data.tel) doc.text(`Téléphone : ${data.tel}`, 20, 66);

  let y = 80;
  doc.text('Description', 20, y);
  doc.text('Qté', 110, y);
  doc.text('Prix', 140, y);
  doc.text('Total', 170, y);
  y += 10;

  let sousTotal = 0;
  PRESTATIONS.forEach((p, i) => {
    const qty = parseFloat(document.getElementById(`qty${i}`).value) || 0;
    if (qty > 0) {
      const total = qty * p.price;
      doc.text(p.name, 20, y);
      doc.text(qty.toString(), 110, y);
      doc.text(fmt.format(p.price), 140, y);
      doc.text(fmt.format(total), 170, y);
      sousTotal += total;
      y += 8;
    }
  });

  document.querySelectorAll('.prestation').forEach(div => {
    const inputs = div.querySelectorAll('input');
    if (inputs.length === 3) {
      const [desc, price, qty] = inputs;
      if (desc.value && price.value && qty.value) {
        const total = parseFloat(price.value) * parseFloat(qty.value);
        doc.text(desc.value, 20, y);
        doc.text(qty.value, 110, y);
        doc.text(fmt.format(price.value), 140, y);
        doc.text(fmt.format(total), 170, y);
        sousTotal += total;
        y += 8;
      }
    }
  });

  if (data.km > 0) {
    const totalKm = data.km * 0.25;
    doc.text('Frais kilométriques', 20, y);
    doc.text(data.km.toString(), 110, y);
    doc.text(fmt.format(0.25), 140, y);
    doc.text(fmt.format(totalKm), 170, y);
    sousTotal += totalKm;
    y += 10;
  }

  const tva = sousTotal * 0.21;
  const totalTTC = sousTotal + tva;
  y += 10;
  doc.text(`Sous-total : ${fmt.format(sousTotal)}`, 20, y);
  y += 8;
  doc.text(`TVA (21%) : ${fmt.format(tva)}`, 20, y);
  y += 8;
  doc.text(`TOTAL TTC : ${fmt.format(totalTTC)}`, 20, y);

  const filename = `${data.type}_${num}_${data.nom.replace(/\s+/g, '_')}.pdf`;
  doc.save(filename);
}