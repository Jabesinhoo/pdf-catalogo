require("dotenv").config();
const app = require("./app");

const PORT = process.env.PORT || 4017;

app.listen(PORT, () => {
  console.log(`Backend corriendo en http://localhost:${PORT}`);
});