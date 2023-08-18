// Importation des modules 
import express from "express"; // framework Express
import "dotenv/config"; // Permet le chargement des variables d'environnement depuis le fichier .env
import cors from "cors"; // Middleware de partage de ressources entre domaines (CORS)
import router from "./router/index.routes.js"; //module router
import morgan from "morgan"; // Middleware de journalisation des requêtes HTTP
import rfs from "rotating-file-stream"; // Flux de fichiers rotatifs pour les logs

import { LOCAL_PORT } from "./config/const.js"; //  variables d'environnement
import { startCronJobs } from "./utils/cronJobs.js"; // pour démarrer les tâches planifiées (cron jobs)

const PORT = process.env.PORT || LOCAL_PORT;
const app = express();

console.log("ici", process.env.PORT);

// Création fichiers pour journaliser les accès, rotation quotidienne
const accessLogStream = rfs.createStream("access.log", {
  interval: "1d", // rotate daily
  path: "./src/log",
});

// Configuration de l'application Express
app
  .use(cors({ origin: "*" }))
  .use(express.json()) // basé sur body-parse rôle pour le json
  .use(express.urlencoded({ extended: true })) // aussi basé sur body parser
  .use(morgan("combined", { stream: accessLogStream })) // log des requêtes
  .use(router)
  .listen(PORT, (err) => {
    err
      ? console.log(err)
      : console.log(`Listening at http://${process.env.HOSTNAME}:${PORT}`);
  });
//

// Démarrage des tâches cron pour mettre à jour cotations et  taux de change
startCronJobs();
        