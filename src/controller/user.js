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



/***********************************************************
 * Création d'un nouvel user -  avec le statut de visiteur par defaut
 */
const signup = async (req, res) => {



  try {
    const query =   `SELECT email, alias
                    FROM user 
                    WHERE email = ?`;
    const isUserExist = await Query.doByValue(query, req.body.email);

   

    // todo : le mot de passe exite déja ->
    if (isUserExist.length > 0) {
      res.status(422).json({ msg: "mail existant" });
    }  
    // le user n'existe pas => création

   
  
    if (isUserExist.length === 0) {
      const { email, pwd, alias } = req.body;
      const hashedPWD = await hash(pwd, saltRounds);
      const query =`INSERT INTO user (email, pwd, alias, role_id) 
                    VALUES (?,?,?,3)`;
      const result = await Query.doByValues(query, { email, hashedPWD, alias });
      res.status(201).json({ msg: "utilisateur créé !", data: result });
    }
  } catch (error) {
      res.status(401).json({msg:"problème d'identifiant", data:error});
    //throw Error(error);
  }
};

/***********************************************************
 * log d'un utilisateur existant avec set du token d'identification 
 */
const signin = async (req, res) => {
  try {
    const { email, pwd } = req.body;
    // on recupère les infos de l'utilisateur dans la DB
    const query1 = `SELECT user.id, email, pwd, alias, title  as role
                    FROM user 
                    JOIN role ON role.id = user.role_id
                    WHERE email = ?`;
    const [user] = await Query.doByValue(query1, email);
  
    //console.log (req.body)
    //console.log ("user", user)

    if (!user || user.email !== email) {
      res.status(401).json(error("problème d'identifiant"));
      return;
    }
    // on verifie la validité de l'email (méthode compare de Bcrypt)
    const isSame = await compare(pwd, user.pwd);
    if (isSame) {
      // si ok on genere le tocken d'identifiation
      const TOKEN = jwt.sign({ id: user.id, alias: user.alias, role: user.role }, TOKEN_SECRET);
      const { id, email, alias, role } = user;
      // on envoie au front le token et des infos nécessaires
      res.status(200).json({ msg: "Connexion réussi",  TOKEN, id, email, alias, role });
    } else {
      res.status(401).json(("problème d'identifiant"));
    }
  } catch (error) {
     res.status(401).json(("problème d'identifiant"));
     
  }
};

export { signup, signin };
