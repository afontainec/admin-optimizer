const sii = require('./sii');
const spreadsheet = require('./spreadsheet');
// const bank = require('./bank');

const f = async () => {
  const facturas = await sii.readFacturas();
  await spreadsheet.connect();
  // await spreadsheet.addFacturas(facturas);
  // await spreadsheet.mapFacturas();
  // const cartola = await bank.readCartola();
  // await spreadsheet.addCartola(cartola);
  // await spreadsheet.mapCartola();
};


f().then(() => {
  console.log('TERMINADO CON EXITO');
}).catch((err) => {
  console.log(err);
}).finally(() => {
  // process.exit();
});
