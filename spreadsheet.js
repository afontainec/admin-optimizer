const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');

const TOKEN_PATH = 'token.json';
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

const SPREADSHEET_ID = '1__yqPDZ-u9thqTn8uQrNmPwa7b5qA9tKo36ylgQGWUk';
const RECIBIDOS_HEADERS = ['Nro.', 'RUT Emisor', 'Folio', 'Fecha Docto.', 'Monto Neto', 'Monto Exento', 'Monto IVA', 'Monto Total', 'Fecha Recep.', 'Evento Receptor', 'Mapped', 'Tipo DTE'];
const RECIBIDOS_FOLIO = 2;
const RECIBIDOS_INFO_RANGE = 'Facturas Rec.!B3:N';
const RECIBIDOS_INSERT_RANGE = 'Facturas Rec.!B4:N4';
const RECIBIDOS_AMOUNT_INDEX = RECIBIDOS_HEADERS.indexOf('Monto Total');

const EMITIDOS_HEADERS = ['Nro.', 'RUT Receptor', 'Empresa', 'Folio', 'Total Reparos', 'Monto Neto', 'Monto Exento', 'Monto IVA', 'Monto Total', 'Fecha Recep.', 'Evento Receptor', 'Mapped'];
const EMITIDOS_FOLIO = 3;
const EMITIDOS_INFO_RANGE = 'Facturas Emi.!B3:Z';
const EMITIDOS_INSERT_RANGE = 'Facturas Emi.!B4:Z4';

const DEBUG_RANGE = 'Debug!B4:X';
const DEBUG_HEADERS = ['Categoría', 'ítem', 'Descripción', 'Fecha de Pago', 'Mes Devengado', 'Ingreso', 'Egreso', 'Saldo Actual', 'Saldo Teórico', 'Pagado', 'Prioridad', 'ATP', 'Número de Factura', 'Rut del Emisor', 'Razón Social', 'Folio Dte', 'Fecha Emisión', 'Fecha Recepción'];
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const connect = async () => {
  const content = JSON.parse(fs.readFileSync('credentials.json'));
  const client = await authorize(content);
  return client;
};

// #region authenticate

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
const authorize = async (credentials) => {
  // eslint-disable-next-line camelcase
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
    client_id, client_secret, redirect_uris[0],
  );
  try {
    const token = fs.readFileSync(TOKEN_PATH);
    oAuth2Client.setCredentials(JSON.parse(token));
  } catch (error) {
    await getNewToken(oAuth2Client);
  }
  return oAuth2Client;
};

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
const getNewToken = async (oAuth2Client) => {
  const authUrl = oAuth2Client.generateAuthUrl({ access_type: 'offline', scope: SCOPES });
  const code = await promptCode(authUrl);
  const token = await fetchToken(code, oAuth2Client);
  oAuth2Client.setCredentials(token);
  await saveToken(token);

};

const promptCode = (authUrl) => {
  return new Promise((resolve) => {
    console.log('Authorize this app by visiting this url:', authUrl);
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question('Enter the code from that page here: ', (code) => {
      rl.close();
      resolve(code);
    });
  });
};

const fetchToken = (code, oAuth2Client) => {
  return new Promise((resolve, reject) => {
    oAuth2Client.getToken(code, (err, token) => {
      if (err) {
        console.error('Error while trying to retrieve access token', err);
        return reject(err);
      }
      return resolve(token);
    });
  });
};

const saveToken = (token) => {
  return new Promise((resolve, reject) => {
    fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
      if (err) {
        console.error(err);
        return reject(err);
      }
      console.log('Token stored to', TOKEN_PATH);
      return resolve();
    });
  });
};

// #endregion


const addFacturas = async (facturas) => {
  const auth = await connect();
  const sheets = google.sheets({ version: 'v4', auth });
  const cartola = await readRange(sheets, DEBUG_RANGE, DEBUG_HEADERS);
  await addFacturasRecibidas(facturas.recieved, sheets, cartola);
  await addFacturasEmitidas(facturas.sent, sheets, cartola);
};


const addFacturasRecibidas = async (facturas, sheets, cartola) => {
  const registered = await readRange(sheets, RECIBIDOS_INFO_RANGE, RECIBIDOS_HEADERS);
  const toAdd = getNewFacturas(facturas, registered, RECIBIDOS_FOLIO);
  const mapped = await mapToAdd(toAdd, cartola, 'Egreso', RECIBIDOS_AMOUNT_INDEX);
  await updateMapped(sheets, mapped, RECIBIDOS_FOLIO, 'Egreso');
  await insertFacturas(toAdd, sheets, RECIBIDOS_INSERT_RANGE);
  console.log('Facturas Recibidas Agregadas', toAdd.length);
  console.log(toAdd);
  return toAdd;
};

const addFacturasEmitidas = async (facturas, sheets) => {
  const registered = await readRange(sheets, EMITIDOS_INFO_RANGE, EMITIDOS_HEADERS);
  const toAdd = getNewFacturas(facturas, registered, EMITIDOS_FOLIO);
  await insertFacturas(toAdd, sheets, EMITIDOS_INSERT_RANGE);
  console.log('Facturas Emitidas Agregadas', toAdd.length);
  console.log(toAdd);
  return toAdd;
};


const readRange = (sheets, range, headers) => {
  return new Promise((resolve, reject) => {
    sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range,
    }, (err, res) => {
      if (err) return reject(err);
      const rows = res.data.values;
      const data = [];
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const element = parseElement(row, headers);
        if (element) data.push(element);
      }
      return resolve(data);
    });
  });
};

const parseElement = (input, headers) => {
  const element = {};
  if (!input || !input[0]) return null;
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i];
    element[header] = input[i];
  }
  return element;
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
  return new Promise((resolve, reject) => {
    sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range,
      valueInputOption: 'RAW',
      resource: { values: array },
    }, (err, res) => {
      if (err) return reject(err);
      return resolve(res);
    });
  });
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
    console.log('La factura:', element.join(' '));
    console.log('Se mapea de mejor manera a que entrada:');
    for (let i = 0; i < options.length; i++) {
      const o = options[i];
      console.log(`${i + 1})`, o['Categoría'], o['ítem'], o['Descripción'], o['Fecha de Pago'], o.Ingreso || o.Egreso);
    }
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question('Indicar el indice (poner 0 si ninguno aplica):', (result) => {
      rl.close();
      resolve(options[result - 1]);
    });
  });
};

// #endregion


const updateMapped = async (sheets, mapped, folio) => {
  for (let i = 0; i < mapped.length; i++) {
    const entry = mapped[i];
    const row = entry.index + 4;
    console.log('vamos a editar row', row);
    // eslint-disable-next-line no-await-in-loop
    await updateEntry(row, entry.mappedTo, sheets, folio);
  }
};

const updateEntry = (row, factura, sheets, folio) => {
  const promises = [];
  let column = alphabet[DEBUG_HEADERS.indexOf('Número de Factura') + 1];
  promises.push(updateCell(sheets, `Debug!${column}${row}`, factura[folio]));
  column = alphabet[DEBUG_HEADERS.indexOf('Rut del Emisor') + 1];
  promises.push(updateCell(sheets, `Debug!${column}${row}`, factura[1]));
  column = alphabet[DEBUG_HEADERS.indexOf('Prioridad') + 1];
  promises.push(updateCell(sheets, `Debug!${column}${row}`, 5));
  return Promise.all(promises);
};


const updateCell = (sheets, range, value) => {
  console.log('vamos a agregar', value, 'en', range);
  return new Promise((resolve, reject) => {
    sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range,
      valueInputOption: 'RAW',
      resource: { values: [[value]] },
    }, (err, res) => {
      if (err) return reject(err);
      return resolve(res);
    });
  });
};


module.exports = {
  connect,
  addFacturas,
};
