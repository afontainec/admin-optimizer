/* eslint-disable no-await-in-loop */

const spreadsheet = require('./spreadsheet');
const UserInterface = require('./interface');

const INGRESO_CATEGORY_RANGE = 'Categorias!B4:B20';
const EGRESO_CATEGORY_RANGE = 'Categorias!D4:D20';

const INGRESO_CELLS = {
  categoria: 'FORMULARIO!C6',
  item: 'FORMULARIO!C8',
  descripcion: 'FORMULARIO!C10',
  fechaEmision: 'FORMULARIO!C12',
  monto: 'FORMULARIO!C14',
  mesDevengado: 'FORMULARIO!C16',
  fechaPago: 'FORMULARIO!C18',
  atp: 'FORMULARIO!C20',
};

const EGRESO_CELLS = {
  categoria: 'FORMULARIO!C30',
  item: 'FORMULARIO!C32',
  descripcion: 'FORMULARIO!C34',
  fechaEmision: 'FORMULARIO!C36',
  monto: 'FORMULARIO!C38',
  mesDevengado: 'FORMULARIO!C40',
  fechaPago: 'FORMULARIO!C42',
  atp: 'FORMULARIO!C44',
};

const getCategorias = (isIngreso, sheets) => {
  const range = isIngreso ? INGRESO_CATEGORY_RANGE : EGRESO_CATEGORY_RANGE;
  return spreadsheet.read(sheets, range);
};


const askCategory = async (isIngreso, sheets) => {
  const categories = await getCategorias(isIngreso, sheets);
  for (let i = 0; i < categories.length; i++) {
    const element = categories[i];
    console.log(`${i + 1})`, element);
  }
  const index = await UserInterface.ask('Indicar el indice (poner 0 si ninguno aplica):');
  return (categories[index - 1] || [''])[0];
};

const prefill = async (sheets, values, isIngreso) => {
  const cells = isIngreso ? INGRESO_CELLS : EGRESO_CELLS;
  const keys = Object.keys(values);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const value = values[key];
    const range = cells[key];
    await spreadsheet.updateCell(sheets, range, value);
  }
};


const toMonth = (input) => {
  const date = new Date(input);
  date.setDate(0);
  return spreadsheet.DATEVALUE(date);
};

module.exports = {
  askCategory,
  prefill,
  toMonth,
};
