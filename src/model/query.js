import { pool } from "../config/database.js";

class Query {
  
  static async find(query) {
    const [result] = await pool.query(query);
    return result;
  }

  // pour find et delete
  static async doByValue(query, value) {
    const [result] = await pool.query(query, [value]);
    return result;
  }

  // on passe un objet et la methode recupère les values
  //**
  //  const query = `
  //     INSERT INTO com (user, msg, date, id_story)
  //     VALUES (?, ?, NOW(), ?)
  //   `;
  //   await Query.doByValues(query, { alias, comment, id_story });
  //  */
  static async doByValues(myquery, datas) {
    const result = pool.query(myquery, [...Object.values(datas)]);
    return result;
  }

}

export default Query;