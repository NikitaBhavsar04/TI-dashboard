// startAgenda.js
const agenda = require('./agenda');
require('dotenv').config();

(async function () {
  await agenda.start();
  console.log('Agenda worker running.');
})();
