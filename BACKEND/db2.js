// db2.js  (in api.bimeducation.in — connects to bimwebsitedb)
import mysql from 'mysql2/promise';
const db2 = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: process.env.DB2_PASSWORD,
  database: 'bim_education',
  connectionLimit: 10,
});
export default db2;