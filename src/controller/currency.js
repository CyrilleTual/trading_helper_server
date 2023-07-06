import Query from "../model/query.js";
/**
 * Selection de tous les stocks
 */
export const getCurrencies = async (req, res) => {
  try {
    const query = `
        SELECT * FROM currency
    `;
    const result = await Query.find(query);
    res.status(200).json(result);
  } catch (error) {
    res.json({ msg: error });
  }
};
