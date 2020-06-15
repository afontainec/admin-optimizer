const path = require('path');
const fs = require('fs');
const RUTS = require('./ruts');

const ONE_DAY = 24 * 60 * 60 * 1000;
const THRESHOLD = new Date().getTime() - ONE_DAY;
const DOWNLOADS_PATH = path.join(__dirname, '..', '..', '..', '..', '..', '..', 'Downloads');
const RECIBIDOS_LENGTH = 9;
const EMITIDOS_LENGTH = 11;

const readFacturas = async () => {
  const files = await todayFiles(DOWNLOADS_PATH);
  const data = await parseFiles(files);
  return data;
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
  let recieved = [];
  let sent = [];
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (isReceived(key)) recieved = recieved.concat(parsedFacturas(files[key], RECIBIDOS_LENGTH));
    else if (isSent(key)) sent = sent.concat(parsedFacturas(files[key], EMITIDOS_LENGTH));
    else console.log(`EL ARCHIVO ${key} CORRESPONDE A NOTAS DE CRÉDITO. AGREGAR MANUALMENTE`);

  }
  return {
    recieved,
    sent,
  };
};

const isReceived = (filename) => {
  return filename.startsWith('DTE_RECIBIDOS_');
};

const isSent = (filename) => {
  const regex = /_61[\s.]/;
  return !regex.test(filename);
};

const parsedFacturas = (file, n) => {
  const parsed = [];
  const lines = file.split('\n');
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const elements = line.split(';');
    if (elements[0]) {
      const factura = extractFactura(elements, n);
      parsed.push(factura);
    }
  }
  return parsed;
};

const extractFactura = (elements, n) => {
  const factura = [];
  for (let j = 0; j < n; j++) {
    const element = elements[j];
    if (isDate(element)) factura.push(parseToDate(element));
    else factura.push(element);
  }
  if (RUTS[factura[1]]) factura.push(RUTS[factura[1]]);
  else console.log(`NO SE ENCONTRÓ RAZON SOCIAL PARA ${factura[1]}`);
  return factura;
};

const isDate = (element) => {
  const regex = /^[0123]\d\/[01]\d\/\d\d\d\d$/;
  return regex.test(element);
};

const parseToDate = (data) => {
  const elements = data.split('/');
  return `${elements[2]}-${elements[1]}-${elements[0]}`;
};

module.exports = {
  readFacturas,
  isDate,
  parseToDate,
};
