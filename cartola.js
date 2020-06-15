const spreadsheet = require('./spreadsheet');

let cartola;
const RANGE = 'Debug!B4:X';
const HEADERS = ['Categoría', 'ítem', 'Descripción', 'Fecha de Pago', 'Mes Devengado', 'Ingreso', 'Egreso', 'Saldo Actual', 'Saldo Teórico', 'Pagado', 'Prioridad', 'ATP', 'Número de Factura', 'Rut del Emisor', 'Razón Social', 'Folio Dte', 'Fecha Emisión', 'Fecha Recepción'];
const get = async (sheets) => {
  if (cartola) return cartola;
  cartola = await spreadsheet.read(sheets, RANGE, HEADERS);
  return cartola;
};


module.exports = {
  get,
  RANGE,
  HEADERS,
};
