const bcrypt = require('bcrypt');

async function generateHash() {
  const password = process.argv[2] || 'Admin123!';
  const saltRounds = 10;
  
  const hash = await bcrypt.hash(password, saltRounds);

}

generateHash().catch(console.error);