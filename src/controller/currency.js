import Query from "../model/query.js";





/**
 * Selection de tous les currencies
 */

export async function appCurrencies (){
   const query = `
        SELECT * FROM currency
    `;
   return await Query.find(query);
} 

/**
 * renvoi les currenccies 
 */
export const getCurrencies = async (req, res) => {
  try {
    const result = await appCurrencies();
    res.status(200).json(result);
  } catch (error) {
    res.json({ msg: error });
  }
};
