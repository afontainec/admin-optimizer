const sii = require('./sii');
const spreadsheet = require('./spreadsheet');
const bank = require('./bank');

const f = async () => {
  // console.log('----------------LEYENDO SSI');
  // const facturas = await sii.readFacturas();
  // console.log('facturas obtenidas');
  // console.log('---------------- AGREGANDO FACTURAS');
  // await spreadsheet.addFacturas(facturas);
  console.log('---------------- LEYENDO CARTOLA');
  const cartola = await bank.readCartola();
  await spreadsheet.addCartola(cartola);
};


f().then(() => {
  console.log('TERMINADO CON EXITO');
}).catch((err) => {
  console.log(err);
}).finally(() => {
  // process.exit();
});
