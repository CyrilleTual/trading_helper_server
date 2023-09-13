import mysql from "mysql2/promise";

// Importation des constantes de configuration de la base de données
import { DB_HOST, DB_NAME, DB_USER, DB_PWD, DB_PORT } from "./const.js";

// Création d'un pool de connexions à la base de données 
const pool = mysql.createPool({
  host: DB_HOST,
  database: DB_NAME,
  user: DB_USER,
  password: DB_PWD,
  port: DB_PORT,
  waitForConnections: true, // Attendre les connexions si le pool est saturé
  connectionLimit: 50, // Limite du nombre de connexions dans le pool
  maxIdle: 50, // Limite maximale des connexions inactives, la valeur par défaut est identique à `connectionLimit`
  idleTimeout: 60000, // Délai d'inactivité des connexions inactives, en millisecondes, la valeur par défaut est de 60000
  queueLimit: 0, // Limite de la file d'attente des connexions, 0 signifie aucune limite
  enableKeepAlive: true, // Activer la surveillance des connexions actives
  keepAliveInitialDelay: 0, // Délai initial pour la surveillance des connexions actives
  ssl: {
    rejectUnauthorized: true,  // pour planet scale -> ssl 
  },
});


export { pool };  
