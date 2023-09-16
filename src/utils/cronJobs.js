import cron from "cron"; //https://github.com/kelektiv/node-cron
import { myWorker } from "./worker.js";
import { updCurrencies } from "./forexUpd.js";

/**
 * Mise en place des tâches planifiées
 * appelé par server.js  au lancement de l'application
 */
export function startCronJobs() {
  
  const cronJobs = [];

  // Gérer le signal de terminaison arrêt des tâches cron en cours d'exécution avant de quitter.
  process.on("SIGTERM", () => {
    cronJobs.forEach((cronJob) => cronJob.stop());
  });

  // Première tâche cron : lancement d'un worker pour la mise à jour des stocks actifs  
  cronJobs.push(
    cron.job(
      "*/15 6-23 * * 1-5", // toutes le 15 min de 6->23h du lu->Ve
      () => {
        myWorker();
      },
      null,
      true,
      "Europe/Paris",
      null,
      //true // premier execution immédiate
    )
  );

  // Deuxième tâche cron : mise à jour des taux de change via API
  cronJobs.push(
    cron.job(
      "0 6-23 * * *", // Toutes les heures de 6 h à 23 h
      () => {
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
