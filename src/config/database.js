import mysql from "mysql2/promise";

import { DB_HOST, DB_NAME, DB_USER, DB_PWD, DB_PORT } from "./const.js";

const pool = mysql.createPool({
  host: DB_HOST,
  database: DB_NAME,
  user: DB_USER,
  password: DB_PWD,
  port: DB_PORT,
  waitForConnections: true,
  connectionLimit: 50,
  maxIdle: 50, // max idle connections, the default value is the same as `connectionLimit`
  idleTimeout: 60000, // idle connections timeout, in milliseconds, the default value 60000
  queueLimit:0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});





// pool.on("acquire", function (connection) {
//   console.log("Connection %d acquired", connection.threadId);
// });

// pool.on("connection", function (connection) {
//   console.log("Pool id %d connected", connection.threadId);
// });

// pool.on("enqueue", function () {
//   console.log("Waiting for available connection slot");
// });

// pool.on("release", function (connection) {
//   console.log("Connection %d released", connection.threadId);
// });


 

export {pool}

