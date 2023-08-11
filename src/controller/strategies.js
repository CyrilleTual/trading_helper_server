import Query from "../model/query.js";

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
