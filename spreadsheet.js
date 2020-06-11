const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');

const TOKEN_PATH = 'token.json';
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];

const SPREADSHEET_ID = '1__yqPDZ-u9thqTn8uQrNmPwa7b5qA9tKo36ylgQGWUk';
const RECIBIDOS_HEADERS = ['Nro.', 'RUT Emisor', 'Folio', 'Fecha Docto.', 'Monto Neto', 'Monto Exento', 'Monto IVA', 'Monto Total', 'Fecha Recep.', 'Evento Receptor', 'Mapped', 'Tipo DTE'];
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
      resolve(token);
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
      resolve();
    });
  });
};

// #endregion


const addFacturas = async (facturas) => {
  const auth = await connect();
  await addFacturasRecibidas(facturas.recieved, auth);
};


const addFacturasRecibidas = async (facturas, auth) => {
  const registered = await getFacturasRecibidas(auth);
  const toAdd = getNewFacturas(facturas, registered);
  console.log(toAdd);
};

const getFacturasRecibidas = (auth) => {
  return new Promise((resolve, reject) => {
    const sheets = google.sheets({ version: 'v4', auth });
    sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Facturas Rec.!B3:N',
    }, (err, res) => {
      if (err) return reject(err);
      const rows = res.data.values;
      const facturas = [];
      for (let i = 0; i < rows.length; i++) {
        const element = rows[i];
        const factura = parseFactura(element, RECIBIDOS_HEADERS);
        if (factura) facturas.push(factura);
      }
      return resolve(facturas);
    });
  });
};

const parseFactura = (element, headers) => {
  const factura = {};
  if (!element || !element[0]) return null;
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i];
    factura[header] = element[i];
  }
  return factura;
};

const getNewFacturas = (facturas, registered) => {
  const hashTable = toHashTable(registered);
  const toAdd = [];
  for (let i = 0; i < facturas.length; i++) {
    const element = facturas[i];
    const key = hash(element);
    if (!hashTable[key]) {
      toAdd.push(element);
      registered.push(element);
    }
  }
  return toAdd;
};

const toHashTable = (registered) => {
  const table = {};
  for (let i = 0; i < registered.length; i++) {
    const element = registered[i];
    const key = hash(Object.values(element));
    table[key] = element;
  }
  return table;
};

const hash = (element) => {
  return `${element[1]}_${element[2]}`;
};

module.exports = {
  connect,
  addFacturas,
};
