import Query from "../model/query.js";

export async function checkAppCurrenccy() {
  try {
    const queryCurrency = `
    SELECT appCurrency
    FROM params
    WHERE id = ?
    `;
    const [result] = await Query.doByValue(queryCurrency, 1);
    return result.appCurrency;
  } catch (error) {
    return ; 
  }
}
