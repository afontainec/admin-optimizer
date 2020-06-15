
const path = require('path');
const fs = require('fs');
const sii = require('./sii');
const spreadsheet = require('./spreadsheet');

const CARTOLA_PATH = path.join(__dirname, 'bank.txt');
const HEADERS = ['Fecha', 'Oficina', 'Descripción', 'Nº Documento', 'Cargo', 'Abono', 'Saldo'];
const BANK_CARTOLA_RANGE = 'Cartola Real!A4:G';

const readNewMovements = () => {
  const input = fs.readFileSync(CARTOLA_PATH, 'utf-8');
  const lines = input.split('\n');
  const movements = [];
  for (let i = 0; i < lines.length; i++) {
    addLine(movements, lines[i]);
  }
  return movements;
};

const addLine = (movements, line) => {
  const elements = line.split('\t');
  if (elements[0] === 'Fecha') return;
  const entry = {};
  for (let i = 0; i < HEADERS.length; i++) {
    const header = HEADERS[i];
    const element = sii.isDate(elements[i]) ? sii.parseToDate(elements[i]) : elements[i];
    entry[header] = element;
  }
  movements.push(entry);
};


const mapMovements = async (movements) => {
  const sheets = await spreadsheet.connect();
  const bankCartola = await getBankCartola(sheets);
  console.log(bankCartola);
  // const toMap = addEntries(cartola, current);
  // mapEntries(toMap);
};

const getBankCartola = (sheets) => {
  return spreadsheet.read(sheets, BANK_CARTOLA_RANGE, HEADERS);

};

// // const addEntries = () => {
// //   for(entry)
// //   const option = getBestOption(...);
// //   if(!option) skip();
// //   if(option.date === lastDate) askIfIsSame();
// //   add(option);
// // }


module.exports = {
  readNewMovements,
  mapMovements,
};
