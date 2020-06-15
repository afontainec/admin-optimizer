
const path = require('path');
const fs = require('fs');
const sii = require('./sii');
const spreadsheet = require('./spreadsheet');

const CARTOLA_PATH = path.join(__dirname, 'bank.txt');
const HEADERS = ['Fecha', 'Oficina', 'Descripción', 'Nº Documento', 'Cargo', 'Abono', 'Saldo'];
const AMOUNT_HEADERS = ['Cargo', 'Abono', 'Saldo'];
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
    let element = sii.isDate(elements[i]) ? sii.parseToDate(elements[i]) : elements[i];
    if (isAnAmount(header)) element = parseAmountToInteger(element);
    entry[header] = element;
  }
  movements.push(entry);
};


const isAnAmount = (header) => {
  return AMOUNT_HEADERS.indexOf(header) > -1;
};

const parseAmountToInteger = (element) => {
  if (element === '') return 0;
  element = element.replace(/\./g, '');
  element = element.replace(/,/g, '');
  return Number.parseInt(element, 10);
};

const mapMovements = async (movements) => {
  const sheets = await spreadsheet.connect();
  const bankCartola = await getBankCartola(sheets);
  const newMovements = getNewMovements(movements, bankCartola);
  console.log(newMovements);
  // const mapped = await mapNewMovements();
  // await updateMapped(mapped);
  // await insertMovements();
  // printMovementSummary();
  // mapEntries(toMap);
};

const getBankCartola = async (sheets) => {
  const result = await spreadsheet.read(sheets, BANK_CARTOLA_RANGE, HEADERS);
  for (let i = 0; i < result.length; i++) {
    const element = result[i];
    for (let j = 0; j < AMOUNT_HEADERS.length; j++) {
      const header = AMOUNT_HEADERS[j];
      element[header] = parseAmountToInteger(element[header]);
    }
  }
  return result;
};

const getNewMovements = (movements, bankCartola) => {
  const hashTable = toHashTable(bankCartola);
  const newMovements = [];
  for (let i = 0; i < movements.length; i++) {
    const movement = movements[i];
    const key = hash(Object.values(movement));
    const bestFit = hashTable[key];
    if (!bestFit) {
      newMovements.push(movement);
      bankCartola.push(movement);
    }
  }
  return newMovements;
};

const toHashTable = (bankCartola) => {
  const table = {};
  for (let i = 0; i < bankCartola.length; i++) {
    const element = bankCartola[i];
    const key = hash(Object.values(element));
    table[key] = element;
  }
  return table;
};

const hash = (value) => {
  return value.join('_');
};


module.exports = {
  readNewMovements,
  mapMovements,
};
