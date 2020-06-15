const sii = require('./sii');
const spreadsheet = require('./spreadsheet');
const bank = require('./bank');

const f = async () => {
  // console.log('----------------LEYENDO SSI');
  // const facturas = await sii.readFacturas();
  // console.log('facturas obtenidas');
  // console.log('---------------- AGREGANDO FACTURAS');
  // await spreadsheet.addFacturas(facturas);
  const cartola = await bank.readCartola();
  console.log(cartola);
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
