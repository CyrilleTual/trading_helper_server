//const cron = require("cron");
import cron from "cron";
const cronJobs = [];

export function updQuote() {
  // Gérer le signal de terminaison arrêt des tâches cron en cours d'exécution avant de quitter.
  process.on("SIGTERM", () => {
    cronJobs.forEach((cronJob) => cronJob.stop());
  });
   
  // Ajouter une première tâche cron
  cronJobs.push(
    cron.job(
      "*/15 * * * * *", // Toutes les x secondes
      () => {
        const d = new Date().toLocaleTimeString();

        // Mettez ici le code que vous voulez exécuter toutes les secondes.
        console.log("Ce message s'affiche toutes les 15 secondes", d);
      },
      null,
      true,
      "Europe/Paris",
      null,
      true // premier execution immédiate
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
