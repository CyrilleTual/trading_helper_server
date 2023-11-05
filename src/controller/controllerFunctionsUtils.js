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

/**
 * Récupère la liste des portefeuilles et leur id pour un utilisateur donné (userId).
 * 
 * @param {*} userId - Identifiant de l'utilisateur.
 * @returns {Array} - Liste des portefeuilles pour l'utilisateur.
 */
export async function portfoliosListByUser(userId) {
    try {
    // Requête SQL pour récupérer les id des portefeuilles d'un utilisateur donné
    const query = `
        SELECT portfolio.id 
        FROM portfolio
        WHERE user_id = ?
    `;
    // Exécute la requête pour obtenir la liste des portefeuilles et leur id pour un utiliateur
     return await Query.doByValue(query, userId);
    } catch (error) {
        console.log (error)
    }
}

/**
 * Récupère la liste des id des stratégies  pour un utilisateur donné (userId).
 * 
 * @param {*} userId - Identifiant de l'utilisateur.
 * @returns {Array} - Liste des id des stratégies pour l'utilisateur.
 */
export async function strategiesIdsByUser(userId) {
    
     try {
       // Requête pour récupérer les stratégies associées à l'utilisateur
       const query = `
            SELECT id
            FROM strategy
            WHERE user_id = ?
        `;
        
       const strategies =  await Query.doByValue(query, userId);
       return strategies; 
     } catch (error) {
        console.log (error)
     }
}

/**
 * Récupère la liste des id des devises  
 * 
 * @returns {Array} - Liste des id des devises  
 */
export async function currenciesIds () {
     try {
       // Requête pour récupérer les devises
       const query = `
            SELECT id
            FROM currency
        `;
       return await Query.find(query);
     } catch (error) {
        console.log (error)
     }
}

/**
 * Récupère le tableau des devises  
 * 
 * @returns {Array} - Liste des id des devises  
 */
export async function currenciesList () {
     try {
       // Requête pour récupérer les devises
       const query = `
            SELECT *
            FROM currency
        `;
       return await Query.find(query);
     } catch (error) {
        console.log (error)
     }
}

/**
 * Récupère la tableau  des devises  
 * 
 * @returns {Array} - tableau des devises  
 */
export async function getCurrencies() {
     try {
       // Requête pour récupérer les devises
       const query = `
            SELECT *
            FROM currency
        `;
       return  await Query.find(query);
     } catch (error) {
        console.log (error)
     }
}

/**
 * Récupère la liste des id des stocks
 * 
 * @returns {Array} - Liste des id des stocks
 */
export async function stocksIds () {
     try {
       const query = `
            SELECT id
            FROM stock
        `;
       return await Query.find(query);
     } catch (error) {
        console.log (error)
     }
}

/**
 * Vérifie si un trade est valide en fonction des paramètres fournis.
 * @param {number} tradeId - L'identifiant du trade
 * @param {number} stockId - L'identifiant du stock
 * @param {number} userId - L'identifiant de l'utilisateur.
 * @returns {Promise<object>} - Renvoie un objet  ou null s'il n'est pas valide.
 */
export async function verifyTrade (tradeId, stockId, userId ) {
    try {
        const query = `
          SELECT trade.id FROM trade
          JOIN portfolio 
          ON trade.portfolio_id  = portfolio.id
          WHERE trade.id = ? and stock_id = ? and portfolio.user_id = ?
        `;
        const result = (await Query.doByValues(query, { tradeId, stockId, userId  }))
        return result[0];
    } catch (error) {
        console.log (error)
    }
}





