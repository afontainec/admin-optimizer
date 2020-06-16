const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');

const ONE_DAY = 1000 * 60 * 60 * 24;

const TOKEN_PATH = 'token.json';
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const SPREADSHEET_ID = '1__yqPDZ-u9thqTn8uQrNmPwa7b5qA9tKo36ylgQGWUk';

const connect = async () => {
  const content = JSON.parse(fs.readFileSync('credentials.json'));
  const auth = await authorize(content);
  const sheets = google.sheets({ version: 'v4', auth });
  return sheets;
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

const read = (sheets, range, headers) => {
  return new Promise((resolve, reject) => {
    sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range,
    }, (err, res) => {
      if (err) return reject(err);
      const rows = res.data.values;
      const data = [];
      if (!headers) return resolve(rows);
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

const updateCell = (sheets, range, value) => {
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

const insertRow = (array, sheets, range) => {
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

const DATEVALUE = (input) => {
  const pivot = new Date('1899-12-30');
  const compare = new Date(input);
  return Math.floor((compare.getTime() - pivot.getTime()) / ONE_DAY);
};

module.exports = {
  connect,
  read,
  updateCell,
  insertRow,
  DATEVALUE,
};
