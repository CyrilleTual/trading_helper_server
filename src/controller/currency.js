import Query from "../model/query.js";

/**
 * Récupère toutes les devises de la base de données.
 * @returns {Promise<Array>} Une promesse résolvant un tableau d'objets de devises.
 */
export async function appCurrencies (){
   const query = ` SELECT * FROM currency `;
   return Query.find(query);
} 

/**
 * Gère la demande GET pour obtenir toutes les devises.
 * @param {Object} req - L'objet de la demande HTTP.
 * @param {Object} res - L'objet de la réponse HTTP.
 */
export const getCurrencies = async (req, res) => {
  try {
    const result = await appCurrencies();
    res.status(200).json(result);
  } catch (error) {
    res.json({ msg: error });
  }
};

/**
 * Interroge la base de données pour obtenir les données Forex.
 * @returns {Promise<Array>} Une promesse résolvant un tableau d'objets représentant les données Forex.
 */
export async function  appGetForex (){
  const query = ` SELECT * FROM forex `;
  return Query.find(query);
}
