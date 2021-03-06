const sii = require('./sii');
const factura = require('./facturas');
const bank = require('./bank');

const f = async () => {
  console.log('----------------LEYENDO SSI');
  const facturas = await sii.readFacturas();
  console.log('facturas obtenidas');
  console.log('---------------- AGREGANDO FACTURAS');
  await factura.add(facturas);
  console.log('---------------- LEYENDO CARTOLA');
  const movements = await bank.readNewMovements();
  await bank.mapMovements(movements);
};


f().then(() => {
  console.log('TERMINADO CON EXITO');
}).catch((err) => {
  console.log(err);
}).finally(() => {
  // process.exit();
});
