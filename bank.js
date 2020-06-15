
const path = require('path');
const fs = require('fs');
const sii = require('./sii');
const { add } = require('./facturas');

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
    const element = sii.isDate(elements[i]) ? sii.parseToDate(elements[i]) : elements[i];
    entry[header] = element;
  }
  cartola.push(entry);
};


const mapCarola = () => {
  const current = getCurrent();
  const toMap = addEntries(cartola, current);
  mapEntries(toMap);
};

// const getCurrent = () => {
//   spreadsheet.read(range, headers);
// };

// // const addEntries = () => {
// //   for(entry)
// //   const option = getBestOption(...);
// //   if(!option) skip();
// //   if(option.date === lastDate) askIfIsSame();
// //   add(option);
// // }


module.exports = {
  readCartola,
};
