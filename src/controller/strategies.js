import Query from "../model/query.js";
import { newStrategieInputCheck } from "./inputsValidationUtils.js";

/**
 * Récupère les stratégies d'un utilisateur.
 *
 * @param {*} req - L'objet de la requête HTTP.
 * @param {*} res - L'objet de la réponse HTTP.
 */
export const getStrategiesByUser = async (req, res) => {
  
  const { userId } = req.params;

  try {
    // Requête pour récupérer les stratégies associées à l'utilisateur
    const query = `
      SELECT id, title
      FROM strategy
      WHERE strategy.user_id = ?
    `;
    const strategies = await Query.doByValue(query, userId);

    // Envoi de la liste des stratégies en réponse
    res.status(200).json(strategies);
  } catch (error) {
    // En cas d'erreur, renvoi d'un message d'erreur dans la réponse JSON
    res
      .status(500)
      .json({ msg: "Erreur lors de la récupération des stratégies", error });
  }
};


/**
 * Création d'une nouvelle strategie 
 * @param {Request} req - Requête HTTP.
 * @param {Response} res - Réponse HTTP.
 */
export const newStrategie = async (req, res) => {
  try {
    const { inputsErrors, verifiedValues } = await newStrategieInputCheck(
      req.body,
      res
    );
    if (inputsErrors.length > 0) {
      // il y a des erreurs
      res.status(403).json({
        msg: "Requête incorrecte, création rejetée",
      });
      return;
    } else {
      const { user_id, title, comment } =
        verifiedValues;
      // Requête d'insertion pour créer une strategie dans la base de données
      const query = `
        INSERT INTO strategy (title, comment, user_id) 
        VALUES (?,?,?)
      `;

      //Exécution de la requête d'insertion 
      await Query.doByValues(query, {
        title,
        comment,
        user_id
      });
      // Réponse indiquant que la dtratégie à été crée avec succès 
      res.status(200).json({ msg: "Strategie créé avec succès." });
    }
  } catch (error) {
    // En cas d'erreur, renvoyer un message d'erreur dans la réponse
    res.json({ msg: "error" });
  }
};
