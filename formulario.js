
const spreadsheet = require('./spreadsheet');
const UserInterface = require('./interface');

const INGRESO_CATEGORY_RANGE = 'Categorias!B4:B20';
const EGRESO_CATEGORY_RANGE = 'Categorias!D4:D20';


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

const prefill = (values) => {
  console.log(values);
};


module.exports = {
  askCategory,
  prefill,
};
