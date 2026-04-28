// Constantes globales
const MAX_CUSTOM_ITEMS = 20;
const MAX_INPUT_LENGTH = 200;
const MAX_QUANTITY = 999;
const PRICE_REGEX = /^[0-9]{1,6}(\.[0-9]{1,2})?$/;

// Nettoie un string pour éviter les XSS
function sanitizeInput(str) {
  if (typeof str !== 'string') return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Valide une quantité (0–999, arrondie à 0.5)
function validateQuantity(value) {
  const num = parseFloat(value) || 0;
  return Math.max(0, Math.min(MAX_QUANTITY, Math.round(num * 2) / 2));
}

// Valide un prix (0–999999.99)
function validatePrice(value) {
  const num = parseFloat(value) || 0;
  if (!PRICE_REGEX.test(num)) return 0;
  return Math.max(0, Math.min(999999.99, num));
}

// Valide une saisie texte
function validateText(str, maxLength = MAX_INPUT_LENGTH) {
  if (typeof str !== 'string') return '';
  return str.trim().substring(0, maxLength);
}

// Retourne les données du formulaire validées
function getData() {
  return {
    type: document.querySelector('input[name="docType"]:checked')?.value || 'devis',
    tvaRate: parseFloat(document.querySelector('input[name="tvaRate"]:checked')?.value || 0),
    nom: validateText(document.getElementById('nomClient').value),
    adresse: validateText(document.getElementById('adresseClient').value),
    tel: validateText(document.getElementById('telClient').value, 20),
    km: validateQuantity(document.getElementById('km').value)
  };
}
