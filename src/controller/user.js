import Query from "../model/query.js";
import { hash, compare } from "bcrypt";
import jwt from "jsonwebtoken";
import { signupInputCheck, signinInputCheck } from "./inputsValidationUtils.js";

const { TOKEN_SECRET } = process.env;
const saltRounds = parseInt(process.env.SALT);


/**
 * Crée un nouvel utilisateur avec le statut de visiteur par défaut.
 *
 * @param {*} req - L'objet de la requête HTTP.
 * @param {*} res - L'objet de la réponse HTTP.
 */
const signup = async (req, res) => {
  // Appel de la fonction de contrôle des inputs
  const { inputsErrors, verifiedValues } = await signupInputCheck(req.body);

  if (inputsErrors.length > 0) {
    // il y des erreurs
    // teste si erreur de mail
    if (
      inputsErrors.find((error) => error === "Email non disponible") !==
      undefined
    ) {
      res.status(422).json({ msg: "Adresse e-mail déjà utilisée" });
      return;
      ///
    } else {
      res.status(400).json({
        msg: "Requête incorrecte, création rejetée",
      });
      return;
    }
  } else {
    // pas d'erreurs on procède à la création de l'utilisateur
    try {
      const { email, pwd, alias } = verifiedValues;
      const hashedPWD = await hash(pwd, saltRounds);
      const query = `
        INSERT INTO user (email, pwd, alias, role_id) 
        VALUES (?,?,?,3)
      `;
      const result = await Query.doByValues(query, { email, hashedPWD, alias });
      res
        .status(201)
        .json({ msg: "Utilisateur créé avec succès !", data: result });
    } catch (error) {
      res.status(500).json({
        msg: "Erreur lors de la création de l'utilisateur",
        data: error,
      });
    }
  }
};

/**
 * Connecte un utilisateur existant et génère un token d'identification.
 *
 * @param {*} req - L'objet de la requête HTTP.
 * @param {*} res - L'objet de la réponse HTTP.
 */
const signin = async (req, res) => {
  // Appel de la fonction de contrôle des inputs
  const { inputsErrors, verifiedValues } = await signinInputCheck(req.body);

  if (inputsErrors.length > 0) {
    // Si des erreurs d'entrée sont présentes, renvoyer une réponse 400 Bad Request
    res.status(403).json({
      msg: "Requête incorrecte, action rejetée",
    });
    return;
  } else { // les inputs sont valides
    const { email, pwd } = verifiedValues;
    try {
      // Récupération des informations de l'utilisateur depuis la base de données
      const query1 = `
        SELECT user.id, email, pwd, alias, role.title as role
        FROM user 
        JOIN role ON role.id = user.role_id
        WHERE email = ?
      `;
      const [user] = await Query.doByValue(query1, email);


      if (!user || user.email !== email) {
        // Si l'utilisateur n'est pas trouvé ou les emails ne correspondent pas, renvoyer une réponse 401 Unauthorized
        res.status(401).json(error("Problème d'identifiant"));
        return;
      }

      // Vérification de la validité du mot de passe (utilisation de la méthode compare de Bcrypt)
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
        // Si le mot de passe ne correspond pas, renvoyer une réponse 401 Unauthorized
        res.status(401).json({ msg: "Problème d'identifiant" });
      }
    } catch (error) {
      // En cas d'erreur lors de la requête, renvoyer une réponse 401 Unauthorized
      res.status(401).json({ msg: "Problème d'identifiant" });
    }
  }
};


/**
 * Vérifie les informations d'utilisateur à partir des données décodées du token etretourne des
 * information complémentaires.
 * @param {Objet} decoded Les données décodées du token contenant les informations de l'utilisateur.
 * @returns Les informations de l'utilisateur obtenues à partir de la base de données.
 */
async function checkinfos(decoded) {
  const { id, role } = decoded;
  // verification de la validité des informations
  const query = `SELECT user.id, email, alias, title  as role
    FROM user
    JOIN role ON role.id = user.role_id
    WHERE user.id = ? AND role.title = ?`;
  const [user] = await Query.doByValues(query, { id, role });
  return user;
}

/**
 * Gère la connexion automatique à partir d'un token valide.
 * @param {Request} req L'objet requête.
 * @param {Response} res L'objet réponse.
 * @returns les infos de l'user
 */
const logByRemenber = async (req, res) => {
  try {
    // Récupère le token depuis l'en-tête de la requête
    const TOKEN = req.headers["x-access-token"];

    // Vérifie si le token est présent et non nul
    if (TOKEN === undefined || TOKEN === "null") {
      res.status(401).json({ msg: "problème d'identification" });
      return;
    } else {
      // Vérifie la validité du token en utilisant la clé secrète
      jwt.verify(TOKEN, TOKEN_SECRET, async (err, decoded) => {
        if (err) {
          res
            .status(401)
            .json({ status: 401, msg: "problème d'identification" });
          return;
        } else {
          // Vérifie la conformité du contenu du token avec les informations de la base de données ( en particulier role) et récupère les informations nécessaires pour le store front

          const user = await checkinfos(decoded);

          if (user.length !== 0) {
            // utilisateur trouvé

            const [{ id, email, alias, role }] = user;

            // Envoie la réponse avec les informations de l'utilisateur
            res.status(200).json({
              msg: "Connexion auto réussie",
              id,
              email,
              alias,
              role,
            });
          }
        }
      });
    }
  } catch (error) {
    res.status(401).json({ msg: "problème d'identification" });
  }
};

export { signup, signin, logByRemenber };
