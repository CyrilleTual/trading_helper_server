//const cron = require("cron");
import cron from "cron";
import { Worker } from "worker_threads";

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
      "*/30 * * * *", 
      () => {
        useWorker();   // on lance la tâche useWorker()
      },
      null,
      true,
      "Europe/Paris",
      null,
      //true // premier execution immédiate
    )
  );

  // Ajouter une seconde tâche cron
  //   cronJobs.push(
  //     cron.job(
  //       "0 */1 * * * *", // Toutes les minutes
  //       () => {
  //         // Mettez ici le code que vous voulez exécuter toutes les minutes.
  //         console.log("Ce message s'affiche toutes les minutes");
  //       },
  //       null,
  //       true
  //     )
  //   );
}
