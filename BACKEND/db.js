import mysql from "mysql";
import dotenv from "dotenv";

dotenv.config();

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: process.env.DB_PASSWORD,
  database: 'bim_education',
});

db.connect((err) => {
  if (err) throw err;
  console.log("MySQL Connected...");
});

export default db;
