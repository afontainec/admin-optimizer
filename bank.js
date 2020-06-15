
const path = require('path');
const fs = require('fs');

const CARTOLA_PATH = path.join(__dirname, 'bank.txt');
const HEADERS = ['Fecha', 'Oficina', 'Descripción', 'Nº Documento', 'Cargo', 'Abono', 'Saldo'];

const readCartola = () => {
  const input = fs.readFileSync(CARTOLA_PATH, 'utf-8');
  const lines = input.split('\n');
  const cartola = [];
  for (let i = 0; i < lines.length; i++) {
    addLine(cartola, lines[i]);
  }
  return cartola;
};

const addLine = (cartola, line) => {
  const elements = line.split('\t');
  if (elements[0] === 'Fecha') return;
  const entry = {};
  for (let i = 0; i < HEADERS.length; i++) {
    const header = HEADERS[i];
    const element = elements[i];
    entry[header] = element;
  }
  cartola.push(entry);
};


module.exports = {
  readCartola,
};
