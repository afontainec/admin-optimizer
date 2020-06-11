const path = require('path');
const fs = require('fs');

const ONE_DAY = 24 * 60 * 60 * 1000;
const THRESHOLD = new Date().getTime() - ONE_DAY;
const DOWNLOADS_PATH = path.join(__dirname, '..', '..', '..', '..', '..', '..', 'Downloads');
const RECIBIDOS_LENGTH = 9;

const readFacturas = async () => {
  const files = await todayFiles(DOWNLOADS_PATH);
  console.log(Object.keys(files));
  const data = await parseFiles(files);
  console.log(data);
};


// #region read Files

const todayFiles = (dirname) => {
  return new Promise((resolve, reject) => {
    fs.readdir(dirname, (err, filenames) => {
      if (err) return reject(err);
      const files = {};
      filenames.forEach((filename) => {
        if (!isSiiFile(filename)) return;
        const filepath = dirname + path.sep + filename;
        const stats = fs.statSync(filepath, 'utf-8');
        if (shouldGoFile(stats)) {
          files[filename] = fs.readFileSync(filepath, 'utf-8');
        }
      });
      return resolve(files);
    });
  });
};

const isSiiFile = (filename) => {
  return filename.startsWith('DTE_') && filename.endsWith('.csv');
};

const shouldGoFile = (stats) => {
  return stats.birthtime.getTime() > THRESHOLD;
};

// #endregion


const parseFiles = (files) => {
  const keys = Object.keys(files);
  const facturas = {
    recieved: [],
    sent: [],
  };
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (isReceived(key)) {
      facturas.recieved = facturas.recieved.concat(parseAsRecieved(files[key]));
    }
  }
  return facturas;
};

const isReceived = (filename) => {
  return filename.startsWith('DTE_RECIBIDOS_');
};

const parseAsRecieved = (file) => {
  const parsed = [];
  const lines = file.split('\n');
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const elements = line.split(';');
    if (elements[0]) {
      const factura = extractFacturaRecibida(elements);

      parsed.push(factura);
    }
  }
  return parsed;
};

const extractFacturaRecibida = (elements) => {
  const factura = [];
  for (let j = 0; j < RECIBIDOS_LENGTH; j++) {
    const element = elements[j];
    if (isDate(element)) factura.push(parseToDate(element));
    else factura.push(element);
  }
  return factura;
};

const isDate = (element) => {
  const regex = /^[0123]\d\/[01]\d\/\d\d\d\d$/;
  return regex.test(element);
};

const parseToDate = (data) => {
  const elements = data.split('/');
  return `${elements[2]}/${elements[1]}/${elements[0]}`;
};

module.exports = {
  readFacturas,
};
