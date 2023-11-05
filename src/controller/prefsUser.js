import Query from "../model/query.js";
 

/**
 * recupération du dernier uid de trade pour un user donné 
 * @param {*} userId 
 * @returns 
 */
export async function lastTadeID(userId) {
  try {
    const query = `
        SELECT lastUidTrade
        FROM prefsUser 
        WHERE user_id = ?
    `;
    const [{ lastUidTrade }] = await Query.doByValue(query, userId);

    return (lastUidTrade);

  } catch (error) {
    console.log(error);
  }
}
 
/**
 * Set d'un nouvel uid de trade dans la table des préférences du user  
 * @param {*} userId 
 * @param {*} newUid 
 */
export async function setNewLastUid(userId, newUid) {
  try {
    const query = `
        UPDATE prefsUser
        SET lastUidTrade = ?
        WHERE user_id = ?
    `;
   await Query.doByValues(query, { newUid, userId });

  } catch (error) {
    console.log(error);
  }
}