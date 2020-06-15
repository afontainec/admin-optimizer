const readline = require('readline');

const ask = (question, options) => {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    let fullQuestion = question;
    if (options) fullQuestion += ` (Posibles opciones: ${options.join(', ')})`;
    rl.question(`${fullQuestion}\n`, (result) => {
      rl.close();
      if (options && options.indexOf(result) === -1) {
        console.log(result, 'no encontrado, intentar nuevamente');
        return resolve(ask(question, options));
      }
      return resolve(result);
    });
  });
};


module.exports = {
  ask,
};
