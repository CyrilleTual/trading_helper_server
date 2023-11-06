import Query from "../model/query.js";
import { checkAndDeleteIfResidual } from "./controllerFunctionsUtils.js";


export async function cleanActiveStockfct() {
  // Requête SQL qui renvoie les identifiants (stock_id) des stocks de la table "activeStock"
  const query = `
        SELECT stock_id 
        FROM activeStock 
    `;

  // Exécution de la requête SQL et stockage des résultats dans la variable "result"
  const result = await Query.find(query);

  // Pour chaque stock, on vérifie s'il est actif, sinon on le supprime de la table "activeStock"
  result.map((stock) => {
    checkAndDeleteIfResidual(stock.stock_id);
  });

  const after = await Query.find(query);

  return ({result, after});
}


// Définition de la fonction "cleanActiveStock" qui nettoie les données de la table "activeStock"
export const cleanActiveStock = async (req, res) => {
  try {

   const {result, after} = await cleanActiveStockfct();
   
    // Réponse HTTP avec un code de statut 200 (OK) et les résultats au format JSON
    res.status(200).json({before: result, after :after});
  } catch (error) {
    // En cas d'erreur, renvoyer une réponse JSON contenant un message d'erreur
    res.json({ msg: error });
  }
};
