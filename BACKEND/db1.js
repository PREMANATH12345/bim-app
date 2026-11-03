import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const db1 = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: process.env.DB_PASSWORD,
  database: 'bim_education',
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export default db1;
