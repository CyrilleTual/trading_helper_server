import jwt from "jsonwebtoken"; //https://github.com/auth0/node-jsonwebtoken
import Query from "../model/query.js";

/**
 * Vérifie si le rôle de l'utilisateur correspond au rôle donné.
 * -> verifie si pas de banissement ?
 * @param {number} id - L'identifiant de l'utilisateur.
 * @param {string} role - Le rôle à vérifier.
 * @returns {boolean} - True si le rôle correspond, sinon False.
 */
async function checkRole(id, role) {
  try {
    // Requête SQL pour obtenir le rôle de l'utilisateur
    const query1 = `SELECT title as role
                    FROM user 
                    JOIN role ON role.id = user.role_id
                    WHERE user.id = ?
    `;

    // Exécute la requête et obtient le résultat
    const [user] = await Query.doByValue(query1, id);

    // Vérifie si le rôle de l'utilisateur correspond au rôle donné
    return role === user.role ? true : false;
  } catch (error) {
    // En cas d'erreur, renvoie false
    return false;
  }
}


/**
 * Middleware de vérification de la validité du token.
 * @param {Object} req - L'objet de requête Express.
 * @param {Object} res - L'objet de réponse Express.
 * @param {Function} next - La fonction pour passer au prochain middleware.
 */
export const auth = async (req, res, next) => {

  // Clef de déchiffrement du token récupérée depuis les variables d'environnement
  const { TOKEN_SECRET } = process.env;

  try {
    // Récupère le token depuis l'en-tête de la requête
    const TOKEN = req.headers["x-access-token"];

    // Vérifie si le token est présent et non nul
    if (TOKEN === undefined || TOKEN === "null") {
      res.status(404).json({ msg: "Token not found" });
      return;
    } else {
      // Vérifie la validité du token en utilisant la clé secrète
      jwt.verify(TOKEN, TOKEN_SECRET, async (err, decoded) => {
        if (err) {
          res.status(401).json({ status: 401, msg: "Invalid token" });
          return;
        } else {
          // Vérifie le rôle de l'utilisateur en utilisant la fonction checkRole
          const isRoleValid = await checkRole(decoded.id, decoded.role);
          if (isRoleValid) {

        

            res.locals.datas = {userId:decoded.id, role:decoded.role} // sauvegarde du token dans reslocals


            req.params.token = decoded; // Sauvegarde le token dans req.params
            next(); // Passe au prochain middleware
          } else {
            res.status(401).json({ status: 401, msg: "Forbidden" });
            return;
          }
        }
      });
    }
  } catch (error) {
    res.status(500).json({ msg: "Internal Server Error" });
  }
};
