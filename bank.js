/* eslint-disable no-await-in-loop */
const path = require('path');
const readline = require('readline');
const fs = require('fs');
const sii = require('./sii');
const spreadsheet = require('./spreadsheet');
const Cartola = require('./cartola');
const Formulario = require('./formulario');
const UserInterface = require('./interface');

const CARTOLA_PATH = path.join(__dirname, 'bank.txt');
const HEADERS = ['Fecha', 'Oficina', 'Descripción', 'Nº Documento', 'Cargo', 'Abono', 'Saldo'];
const AMOUNT_HEADERS = ['Cargo', 'Abono', 'Saldo'];
const BANK_CARTOLA_RANGE = 'Cartola Real!A4:H';
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const INSERT_RANGE = 'Cartola Real!A4:H4';

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

const parseAmountToInteger = (input) => {
  if (input === '') return 0;
  input = input.replace(/\(/g, '');
  input = input.replace(/\)/g, '');
  input = input.replace(/\./g, '');
  input = input.replace(/,/g, '');
  return Number.parseInt(input, 10);
};

const mapMovements = async (movements) => {
  const sheets = await spreadsheet.connect();
  const bankCartola = await getBankCartola(sheets);
  const newMovements = getNewMovements(movements, bankCartola);
  const mapped = await mapNewMovements(newMovements, sheets);
  await updateMapped(sheets, mapped);
  await addManually(newMovements, sheets);
  await insertMovements(newMovements, sheets, INSERT_RANGE);
  printResults(newMovements);
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

// #region GET NEW MOVEMENTS

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


// #region HASH TABLE

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

// #endregion

// #endregion

// #region MAP NEW MOVEMENTS
const mapNewMovements = async (movements, bankCartola, sheets) => {
  const cartola = await Cartola.get(sheets);
  const mapped = [];
  for (let i = 0; i < movements.length; i++) {
    const element = movements[i];
    const options = getBestOptions(element, cartola);
    // eslint-disable-next-line no-await-in-loop
    const best = await selectOption(element, options);
    if (best) {
      element.Mapped = 1;
      best.Pagado = '1';
      best.mappedTo = element;
      mapped.push(best);
    }
  }
  return mapped;
};

const getBestOptions = (element, cartola) => {
  const options = [];
  for (let i = 0; i < cartola.length; i++) {
    const entry = cartola[i];
    if (notMapped(entry)) {
      entry.index = i;
      const cargoDiff = getPorcentageDifference(element.Cargo, parseAmountToInteger(entry.Egreso));
      const abonoDiff = getPorcentageDifference(element.Abono, parseAmountToInteger(entry.Ingreso));
      const diff = Number.isNaN(cargoDiff) ? abonoDiff : cargoDiff;
      if (diff < 15) options.push(entry);
    }
  }
  return options;
};


const getPorcentageDifference = (a, b) => {
  return Math.abs(Math.round((a - b) / b * 100));
};

const notMapped = (entry) => {
  return entry.Pagado !== '1';
};

const selectOption = (element, options) => {
  return new Promise((resolve) => {
    console.log('El movimiento: \n', Object.values(element).join(' '));
    console.log('Se mapea de mejor manera a que entrada:');
    for (let i = 0; i < options.length; i++) {
      const o = options[i];
      console.log(`${i + 1})`, o['Categoría'], o['ítem'], o['Descripción'], o['Fecha de Pago'], o.Ingreso || o.Egreso);
    }
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question('Indicar el indice (poner 0 si ninguno aplica):', (result) => {
      console.log('Entendido! \n');
      rl.close();
      resolve(options[result - 1]);
    });
  });
};

// #endregion


const updateMapped = async (sheets, mapped) => {
  for (let i = 0; i < mapped.length; i++) {
    const entry = mapped[i];
    const row = entry.index + 4;
    // eslint-disable-next-line no-await-in-loop
    await updateEntry(row, entry.mappedTo, sheets);
  }
};

const updateEntry = (row, entry, sheets) => {
  const promises = [];
  let column = alphabet[Cartola.HEADERS.indexOf('Pagado') + 1];
  promises.push(spreadsheet.updateCell(sheets, `Debug!${column}${row}`, 1));
  const amountKey = entry.Abono ? 'Ingreso' : 'Egreso';
  const amount = entry.Abono ? entry.Abono : -1 * entry.Cargo;
  column = alphabet[Cartola.HEADERS.indexOf(amountKey) + 1];
  promises.push(spreadsheet.updateCell(sheets, `Debug!${column}${row}`, amount));
  column = alphabet[Cartola.HEADERS.indexOf('Fecha de Pago') + 1];
  promises.push(spreadsheet.updateCell(sheets, `Debug!${column}${row}`, spreadsheet.DATEVALUE(entry.Fecha)));
  return Promise.all(promises);
};

const insertMovements = (movements, sheets, range) => {
  const array = parseForInsert(movements);
  return spreadsheet.insertRow(array, sheets, range);
};

const parseForInsert = (movements) => {
  const parsed = [];
  for (let i = 0; i < movements.length; i++) {
    const element = movements[i];
    parsed.push(Object.values(element));
  }
  return parsed;
};


const addManually = async (movements, sheets) => {
  const missing = movements.map((element) => { return element.Mapped ? null : element; });

  for (let i = 0; i < missing.length; i++) {
    const element = missing[i];
    if (element) {
      const shouldAdd = await shouldManuallyAdd(element);
      if (shouldAdd) await manuallyAdd(element, sheets);
    }
  }
};

const shouldManuallyAdd = async (element) => {
  console.log('Desea agregar manualmente:');
  console.log('', Object.values(element).join(' '));
  const result = await UserInterface.ask('Ingrese s/n');
  return result.toLowerCase() === 's';
};


const manuallyAdd = async (element, sheets) => {
  const isIngreso = !!element.Abono;
  const values = {};
  values.categoria = await Formulario.askCategory(isIngreso, sheets);
  values.item = await UserInterface.ask('Item:');
  values.descripcion = await UserInterface.ask('Descripción:');
  values.fechaEmision = element.Fecha;
  values.monto = element.Abono || element.Cargo;
  values.fechaPago = element.Fecha;
  values.mesDevengado = Formulario.toMonth(element.Fecha);
  values.atp = await UserInterface.ask('ATP:', ['Si', 'No']);
  await Formulario.prefill(sheets, values, isIngreso);
  await UserInterface.ask('Datos rellenados en formulario exitosamente. Ir a spreadsheet apretar ingresar y volver para aca.');
  element.Mapped = 1;
  return values;
};


const printResults = (movements) => {
  const mapped = movements.map((element) => { return element.Mapped ? element : null; });
  console.log('Movimientos agregados y mapeados: ');
  for (let i = 0; i < mapped.length; i++) {
    const element = mapped[i];
    if (element) console.log(Object.values(element).join(' '));
  }
};

module.exports = {
  readNewMovements,
  mapMovements,
};
