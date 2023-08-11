import Query from "../model/query.js";
import { hash, compare } from "bcrypt";
import jwt from "jsonwebtoken";

const { TOKEN_SECRET } = process.env;
const saltRounds = parseInt(process.env.SALT);

// const checkToken = async (req, res) => {
//   try {
//     const query = "SELECT email, role FROM user WHERE id = ?";
//     const [user] = await Query.findByValue(query, req.params.id);

//     if (user) {
//       const msg = "Utilisateur récupéré";
//       res.status(200).json(success(msg, user));
//     } else {
//       const msg = "Pas de compte avec ces identifiants";
//       res.status(200).json(success(msg));
//     }
//   } catch (error) {
//     throw Error(error);
//   }
// };



/**
 * Crée un nouvel utilisateur avec le statut de visiteur par défaut.
 * 
 * @param {*} req - L'objet de la requête HTTP.
 * @param {*} res - L'objet de la réponse HTTP.
 */
const signup = async (req, res) => {
  try {
    const query = `
      SELECT email, alias
      FROM user 
      WHERE email = ?
    `;
    const isUserExist = await Query.doByValue(query, req.body.email);

    // Si le mail existe déjà
    if (isUserExist.length > 0) {
      res.status(422).json({ msg: "Adresse e-mail déjà utilisée" });
      return;
    }

    // Si l'utilisateur n'existe pas, création
    if (isUserExist.length === 0) {
      const { email, pwd, alias } = req.body;
      const hashedPWD = await hash(pwd, saltRounds);
      const query = `
        INSERT INTO user (email, pwd, alias, role_id) 
        VALUES (?,?,?,3)
      `;
      const result = await Query.doByValues(query, { email, hashedPWD, alias });

      res
        .status(201)
        .json({ msg: "Utilisateur créé avec succès !", data: result });
    }
  } catch (error) {
    res
      .status(500)
      .json({
        msg: "Erreur lors de la création de l'utilisateur",
        data: error,
      });
    //throw Error(error);
  }
};

/**
 * Connecte un utilisateur existant et génère un token d'identification.
 *
 * @param {*} req - L'objet de la requête HTTP.
 * @param {*} res - L'objet de la réponse HTTP.
 */
const signin = async (req, res) => {
  try {
    const { email, pwd } = req.body;

    // Récupération des informations de l'utilisateur depuis la base de données
    const query1 = `SELECT user.id, email, pwd, alias, title  as role
      FROM user 
      JOIN role ON role.id = user.role_id
      WHERE email = ?`;
    const [user] = await Query.doByValue(query1, email);

    if (!user || user.email !== email) {
      res.status(401).json(error("Problème d'identifiant"));
      return;
    }

    // Vérification de la validité de l'email (utilisation de la méthode compare de Bcrypt)
    const isSame = await compare(pwd, user.pwd);
    if (isSame) {
      // Génération du token d'identification
      const TOKEN = jwt.sign(
        { id: user.id, alias: user.alias, role: user.role },
        TOKEN_SECRET
      );
      const { id, email, alias, role } = user;

      // Envoi du token et des informations nécessaires au front-end
      res.status(200).json({
        msg: "Connexion réussie",
        TOKEN,
        id,
        email,
        alias,
        role,
      });
    } else {
      res.status(401).json({ msg: "Problème d'identifiant" });
    }
  } catch (error) {
    res.status(401).json({ msg: "Problème d'identifiant" });
  }
};

export { signup, signin };
