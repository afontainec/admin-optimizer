const path = require('path');
const fs = require('fs');

const ONE_DAY = 24 * 60 * 60 * 1000;
const THRESHOLD = new Date().getTime() - ONE_DAY;
const DOWNLOADS_PATH = path.join(__dirname, '..', '..', '..', '..', '..', '..', 'Downloads');

const readFacturas = async () => {
  const filenames = await todayFiles(DOWNLOADS_PATH);
  console.log(filenames);
};


const todayFiles = (dirname) => {
  return new Promise((resolve, reject) => {
    fs.readdir(dirname, (err, filenames) => {
      if (err) return reject(err);
      const files = [];
      filenames.forEach((filename) => {
        if (!isSiiFile(filename)) return;
        const stats = fs.statSync(dirname + path.sep + filename, 'utf-8');
        if (shouldGoFile(stats)) files.push(filename);
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


module.exports = {
  readFacturas,
};
