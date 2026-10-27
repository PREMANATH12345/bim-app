// db2.js  (in api.bimeducation.in — connects to bimwebsitedb)
import mysql from 'mysql2/promise';
const db2 = mysql.createPool({
  host: process.env.DB2_HOST,
  user: process.env.DB2_USER,
  password: process.env.DB2_PASSWORD,
  database: 'bimwebsitedb',
  connectionLimit: 10,
});
export default db2;