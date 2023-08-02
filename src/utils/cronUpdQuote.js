//const cron = require("cron");
import cron from "cron";
import { Worker } from "worker_threads";
import { updCurrencies } from "./forexUpd.js";

const cronJobs = [];

/***********************************************************
 * Lance la maj des cours dans un worker
 */
function useWorker() {
  return new Promise((resolve, reject) => {
    // conn
    const worker = new Worker("./src/utils/workerUpd.js");
    worker.on("online", () => {
      const d1 = new Date().toLocaleTimeString();
      console.log(" à : ", d1, "Appel au worker ");
    });
    worker.on("message", (messageFromWorker) => {
      const d = new Date().toLocaleTimeString();
      console.log(" à : ", d, messageFromWorker);
      return resolve;
    });
    worker.on("error", reject);
    worker.on("exit", (code) => {
      // conn close
      if (code !== 0) {
        reject(new Error(`Worker stopped with exit code ${code}`));
      }
    });
  });
}

//**********************************************************
//appelé par server.js  au lancement de l'application
//

export function updQuote() {
  // Gérer le signal de terminaison arrêt des tâches cron en cours d'exécution avant de quitter.
  process.on("SIGTERM", () => {
    cronJobs.forEach((cronJob) => cronJob.stop());
  });

  // Ajouter une première tâche cron
  cronJobs.push(
    cron.job(
      "*/15 6-23 * * 1-5", // toutes le 15 min de 6->23h du lu->Ve
      () => {
        useWorker(); // on lance la tâche useWorker() pour upd des cours
      },
      null,
      true,
      "Europe/Paris",
      null
      //true // premier execution immédiate
    )
  );

  // seconde tâche cron : upd des taux de changes par API
  cronJobs.push(
    cron.job(
      "0 6-23 * * *", // Toutes les heures de 6->23
      () => {
        // ici le code à executer
        updCurrencies();
      },
      null,
      true,
      "Europe/Paris",
      null,
      //true // premier execution immédiate
    )
  );
}
