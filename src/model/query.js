import { pool } from "../config/database.js";

/**
 * Classe Query pour interagir avec la base de données.
 */
class Query {
  /**
   * Exécute une requête simple et retourne le résultat.
   * @param {string} query - La requête SQL SELECT à exécuter.
   * @returns {Array} - Le résultat de la requête.
   */
  static async find(query) {
    const [result] = await pool.query(query);
    return result;
  }

  /**
   * Exécute une requête de type SELECT ou DELETE avec une seule valeur et retourne le résultat.
   * @param {string} query - La requête SQL SELECT ou DELETE à exécuter.
   * @param {*} value - La valeur à utiliser dans la requête.
   * @returns {Array} - Le résultat de la requête.
   */
  static async doByValue(query, value) {
    const [result] = await pool.query(query, [value]);
    return result;
  }

  /**
   * Exécute une requête SQL avec un objet de données et retourne le résultat.
   * @param {string} myquery - La requête SQL à exécuter.
   * @param {Object} datas - L'objet contenant les valeurs à utiliser dans la requête.
   * @returns {Array} - Le résultat de la requête.
   */
  static async doByValues(myquery, datas) {
    const result = await pool.query(myquery, [...Object.values(datas)]);
    return result;
  }
}

export default Query;



// exemple utilisation de doByValues
// on passe un objet et la methode recupère les values
//**
//  const query = `
//     INSERT INTO com (user, msg, date, id_story)
//     VALUES (?, ?, NOW(), ?)
//   `;
//   await Query.doByValues(query, { alias, comment, id_story });
//  */