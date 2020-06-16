/* eslint-disable no-await-in-loop */

const readline = require('readline');
const spreadsheet = require('./spreadsheet');
const Cartola = require('./cartola');
const UserInterface = require('./interface');
const Formulario = require('./formulario');

const RECIBIDOS_HEADERS = ['Nro.', 'RUT Emisor', 'Folio', 'Fecha Docto.', 'Monto Neto', 'Monto Exento', 'Monto IVA', 'Monto Total', 'Fecha Recep.', 'Evento Receptor', 'Mapped', 'Tipo DTE'];
const RECIBIDOS_FOLIO = 2;
const RECIBIDOS_INFO_RANGE = 'Facturas Rec.!B3:N';
const RECIBIDOS_INSERT_RANGE = 'Facturas Rec.!B4:N4';
const RECIBIDOS_AMOUNT_INDEX = RECIBIDOS_HEADERS.indexOf('Monto Total');

const EMITIDOS_HEADERS = ['Nro.', 'RUT Receptor', 'Empresa', 'Folio', 'Total Reparos', 'Monto Neto', 'Monto Exento', 'Monto IVA', 'Monto Total', 'Fecha Recep.', 'Evento Receptor', 'Mapped'];
const EMITIDOS_FOLIO = 3;
const EMITIDOS_INFO_RANGE = 'Facturas Emi.!B3:Z';
const EMITIDOS_INSERT_RANGE = 'Facturas Emi.!B4:Z4';
const EMITIDOS_AMOUNT_INDEX = 9;


const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';


// #region ADD FACTURAS
const add = async (facturas) => {
  const sheets = await spreadsheet.connect();
  const cartola = await Cartola.get(sheets);
  await addFacturasRecibidas(facturas.recieved, sheets, cartola);
  // await addFacturasEmitidas(facturas.sent, sheets, cartola);
};


const addFacturasRecibidas = async (facturas, sheets, cartola) => {
  console.log('-------- FACTURAS RECIBIDAS');
  const registered = await spreadsheet.read(sheets, RECIBIDOS_INFO_RANGE, RECIBIDOS_HEADERS);
  const toAdd = getNewFacturas(facturas, registered, RECIBIDOS_FOLIO);
  const mapped = await mapToAdd(toAdd, cartola, 'Egreso', RECIBIDOS_AMOUNT_INDEX);
  await updateMapped(sheets, mapped, RECIBIDOS_FOLIO, 'Egreso', RECIBIDOS_AMOUNT_INDEX);
  await addManually(toAdd, sheets, false);
  // await insertFacturas(toAdd, sheets, RECIBIDOS_INSERT_RANGE);
  // console.log('Facturas Recibidas Agregadas', toAdd.length);
  // for (let i = 0; i < toAdd.length; i++) { console.log(toAdd[i].join(' ')); }
  // return toAdd;
};

const addFacturasEmitidas = async (facturas, sheets, cartola) => {
  console.log('-------- FACTURAS EMITIDAS');
  const registered = await spreadsheet.read(sheets, EMITIDOS_INFO_RANGE, EMITIDOS_HEADERS);
  const toAdd = getNewFacturas(facturas, registered, EMITIDOS_FOLIO);
  const mapped = await mapToAdd(toAdd, cartola, 'Ingreso', EMITIDOS_AMOUNT_INDEX);
  await updateMapped(sheets, mapped, EMITIDOS_FOLIO, 'Ingreso', EMITIDOS_AMOUNT_INDEX);
  await insertFacturas(toAdd, sheets, EMITIDOS_INSERT_RANGE);
  console.log('Facturas Emitidas Agregadas', toAdd.length);
  for (let i = 0; i < toAdd.length; i++) { console.log(toAdd[i].join(' ')); }
  return toAdd;
};


// #region Facturas

const getNewFacturas = (facturas, registered, folio) => {
  const hashTable = toHashTable(registered, folio);
  const toAdd = [];
  for (let i = 0; i < facturas.length; i++) {
    const element = facturas[i];
    const key = hash(element, folio);
    if (!hashTable[key]) {
      toAdd.push(element);
      registered.push(element);
    }
  }
  return toAdd;
};

const toHashTable = (registered, folio) => {
  const table = {};
  for (let i = 0; i < registered.length; i++) {
    const element = registered[i];
    const key = hash(Object.values(element), folio);
    table[key] = element;
  }
  return table;
};

const hash = (element, folio) => {
  return `${element[1]}_${element[folio]}`;
};

const insertFacturas = (array, sheets, range) => {
  return spreadsheet.insertRow(array, sheets, range);
};

// #endregion

const mapToAdd = async (toAdd, cartola, cartolaIndex, elementIndex) => {
  const mapped = [];
  for (let i = 0; i < toAdd.length; i++) {
    const element = toAdd[i];
    const options = getBestOptions(element, cartola, cartolaIndex, elementIndex);
    // eslint-disable-next-line no-await-in-loop
    const best = await selectOption(element, options);
    if (best) {
      element.push(1);
      best.mappedTo = element;
      mapped.push(best);
    }
  }
  return mapped;
};

// #region  getBestOptions
const getBestOptions = (element, cartola, cartolaIndex, elementIndex) => {
  const options = [];
  for (let i = 0; i < cartola.length; i++) {
    const entry = cartola[i];
    if (notMapped(entry)) {
      entry.index = i;
      const entryAmount = parseAmount(entry[cartolaIndex]);
      const elementAmount = parseAmount(element[elementIndex]);
      const diff = getPorcentageDifference(entryAmount, elementAmount);
      if (diff < 15) options.push(entry);
    }
  }
  return options;
};

const parseAmount = (input) => {
  // if (input.startsWith('(')) input = `-${input}`;
  input = input.replace(/\(/g, '');
  input = input.replace(/\)/g, '');
  input = input.replace(/,/g, '');
  return Number.parseInt(input, 10);
};

const getPorcentageDifference = (a, b) => {
  return Math.abs(Math.round((a - b) / b * 100));
};

const notMapped = (entry) => {
  return entry.Pagado !== '1' && !entry['Número de Factura'];
};


const selectOption = (element, options) => {
  return new Promise((resolve) => {
    console.log('La factura: \n', element.join(' '));
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


const updateMapped = async (sheets, mapped, folio, amountKey, amountIndex) => {
  for (let i = 0; i < mapped.length; i++) {
    const entry = mapped[i];
    const row = entry.index + 4;
    // eslint-disable-next-line no-await-in-loop
    await updateEntry(row, entry.mappedTo, sheets, folio, amountKey, amountIndex);
  }
};

const updateEntry = (row, factura, sheets, folio, amountKey, amountIndex) => {
  const promises = [];
  let column = alphabet[Cartola.HEADERS.indexOf('Número de Factura') + 1];
  promises.push(spreadsheet.updateCell(sheets, `Debug!${column}${row}`, factura[folio]));
  column = alphabet[Cartola.HEADERS.indexOf('Rut del Emisor') + 1];
  promises.push(spreadsheet.updateCell(sheets, `Debug!${column}${row}`, factura[1]));
  column = alphabet[Cartola.HEADERS.indexOf('Prioridad') + 1];
  promises.push(spreadsheet.updateCell(sheets, `Debug!${column}${row}`, 5));
  column = alphabet[Cartola.HEADERS.indexOf(amountKey) + 1];
  const amount = parseAmountToInteger(factura[amountIndex], amountKey);
  promises.push(spreadsheet.updateCell(sheets, `Debug!${column}${row}`, amount));
  return Promise.all(promises);
};

const parseAmountToInteger = (input, key) => {
  let result = Number.parseInt(input, 10);
  if (key === 'Egreso') result *= -1;
  return result;
};


// #region ADD MANUALLY

const addManually = async (toAdd, sheets, isIngreso) => {
  const missing = toAdd.map((element) => { return element[element.length - 1] !== 1 ? element : null; });
  for (let i = 0; i < missing.length; i++) {
    const element = missing[i];
    if (element) {
      const shouldAdd = await shouldManuallyAdd(element);
      if (shouldAdd) await manuallyAdd(element, sheets, isIngreso);
    }
  }
};

const shouldManuallyAdd = async (element) => {
  console.log('Desea agregar manualmente:');
  console.log('', element.join(' '));
  const result = await UserInterface.ask('Ingrese s/n');
  return result.toLowerCase() === 's';
};

const manuallyAdd = async (element, sheets, isIngreso) => {
  const values = {};
  values.categoria = await Formulario.askCategory(isIngreso, sheets);
  values.item = await UserInterface.ask('Item:');
  values.descripcion = await UserInterface.ask('Descripción:');
  const date = isIngreso ? element[9] : element[3];
  values.fechaEmision = date;
  values.monto = isIngreso ? element[EMITIDOS_AMOUNT_INDEX] : element[RECIBIDOS_AMOUNT_INDEX];
  values.monto = Number.parseInt(values.monto, 10);
  values.fechaPago = date;
  values.mesDevengado = Formulario.toMonth(date);
  values.atp = await UserInterface.ask('ATP:', ['Si', 'No']);
  await Formulario.prefill(sheets, values, isIngreso);
  await UserInterface.ask('Datos rellenados en formulario exitosamente. Ir a spreadsheet apretar ingresar y volver para aca.');
  element.Mapped = 1;
  return values;
};

// #endregion


module.exports = {
  add,
};
