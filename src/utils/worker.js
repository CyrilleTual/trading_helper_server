import { Worker } from "worker_threads";

/***********************************************************
 * Lance la mise à jour des cours dans un worker
 */
export function myWorker() {
  return new Promise((resolve, reject) => {

    // Créer un worker qui lance la mise à jour des cours 
    const worker = new Worker("./src/utils/quotesUpd.js");

    // Quand le worker est onLine
    worker.on("online", () => {
      const callTime = new Date().toLocaleTimeString();
      console.log(" À : ", callTime, "Appel au worker ");
    });

    // Quand un message est reçu du worker (task done si tout va bien)
    worker.on("message", (messageDuWorker) => {
      const receptionTime = new Date().toLocaleTimeString();
      console.log(" À : ", receptionTime, messageDuWorker);
      resolve(); // Résoudre la promesse une fois terminé
    });

    // En cas d'erreur dans le worker
    worker.on("error", reject);

    // Quand le worker se termine
    worker.on("exit", (code) => {
      // Fermeture de la connexion
      if (code !== 0) {
        reject(
          new Error(`Le worker s'est arrêté avec le code de sortie ${code}`)
        );
      }
    });
  });
}

