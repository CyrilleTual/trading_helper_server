import jwt from "jsonwebtoken";
import Query from "../model/query.js";

async function checkRole(id, role) {
  const query1 = `SELECT title  as role
                    FROM user 
                    JOIN role ON role.id = user.role_id
                    WHERE user.id = ?`;
  const [user] = await Query.doByValue(query1, id);
   return(role === user.role ? true : false) ;

}

//**********************************************************
//* Middle ware de verification de la validité du token
//*/
const { TOKEN_SECRET } = process.env; // cle de décriptage du token

export const auth = async (req, res, next) => {
  // va chercher le token dans l'entete
  const TOKEN = req.headers["x-access-token"];

  // verifie la validité du tocken
  if (TOKEN === undefined || TOKEN === "null") {
    res.status(404).json({ msg: "token not found" });
    return;
  } else {
    jwt.verify(TOKEN, TOKEN_SECRET, async (err, decoded) => {
      if (err) {
        res.status(401).json({ status: 401, msg: "token invalid" });
        return;
      } else {

        const ok = await checkRole(decoded.id, decoded.role);

        console.log ("ok",ok)

        if (ok){
            req.params.token = decoded; // on sauve le token dans req.params
        console.log();
        next(); 
        }else{
            res.status(401).json({ status: 401, msg: "forbiden" });
            return;
        }
        
       
      }
    });
  }
};
