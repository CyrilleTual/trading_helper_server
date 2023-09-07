import Query from "../model/query.js";
import { updCurrencies } from "./forexUpd.js";
import { myWorker } from "./worker.js";

// recherche la différence actualisation sauf we

export async function checkIfUpdNeeded(req, res) {
  // recherche la  date actualisation des trades
  const query = `
    SELECT updDate
    FROM activeStock 
    `;
  const upd = await Query.find(query);

  // si on trouve au moins un trade actif
  if (upd.length > 0) {
    const lastUpd = new Date(upd[0].updDate);
    // temps en minutes depuis la dernière maj
    const delta = (new Date() - lastUpd) / 60000;
    // si maj depuis + de 15 min -> on refait maj des cours
    if (delta > 15) {
      myWorker();


    }
 
    res.status(200).json(delta);
  }

  // recherche de la dernière maj des taux de change
  // Récupère l'ID de la devise de base de l'application
  //const appCurrencyId = process.env.APP_CURRENCY_ID;
  const appCurrencyId = global.appCurrency;

  // Récupère l'heure de la dernière maj forex

  const queryforex = `
    SELECT date FROM forex 
    WHERE from_currency = ?
    `;
  const [result] = await Query.doByValues(queryforex, {
    appCurrencyId,
  });

  const lastUpdForex = new Date(result[0].date);
   const deltaFx = (new Date() - lastUpdForex) / 60000;
   // si maj depuis + de 15 min -> on refait maj des cours
   if (deltaFx > 1) {
     console.log ("maj forex")
     updCurrencies();
   }

  

  // date de maj
}
