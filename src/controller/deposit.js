import Query from "../model/query.js";

/**
 * Alimente un portefeuille en ajoutant un montant de dépôt.
 * @param {number} idPort - L'ID du portefeuille auquel le montant doit être ajouté.
 * @param {number} amount - Le montant à ajouter au portefeuille.
 */
export async function feedPortfolio(idPort, amount) {
  const query2 = `INSERT INTO deposit(porfolio_id, amount) VALUES (?,?)`;
  Query.doByValues(query2, {
    idPort,
    amount,
  });
}

