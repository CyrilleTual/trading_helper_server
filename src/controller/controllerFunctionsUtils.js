import Query from "../model/query.js";


/**
 * Vérifie si un utilisateur existe dans la base de données en utilisant l'adresse e-mail comme critère de recherche.
 *
 * @param {*} email - L'adresse e-mail de l'utilisateur à rechercher.
 * @returns {boolean} - Renvoie true si l'utilisateur est trouvé (ou si erreur), sinon false.
 */
export async function checkIfUserExistByEmail(email) {

  try {
    const query = `
            SELECT email, alias
            FROM user 
            WHERE email = ?
        `;

    // Exécute la requête SQL avec l'adresse e-mail comme valeur
    const userExist = await Query.doByValue(query, email);

    // Si des enregistrements sont trouvés, renvoie true, sinon renvoie false
    return userExist.length > 0;

  } catch (error) {
    console.log(error);
    // En cas d'erreur, renvoie true pour bloquer la suite du traitement
    return true;
  }
}
