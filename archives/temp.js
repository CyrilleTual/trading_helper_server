 import jwt from "jsonwebtoken";

 // Clef de déchiffrement du token récupérée depuis les variables d'environnement
 const { TOKEN_SECRET } = process.env;

 /**
  * Middleware de vérification de la validité du token.
  * @param {Object} req - L'objet de requête Express.
  * @param {Object} res - L'objet de réponse Express.
  * @param {Function} next - La fonction pour passer au prochain middleware.
  */
 export const auth = async (req, res, next) => {
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
