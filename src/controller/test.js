import Query from "../model/query.js";
import { scrapeAbc } from "../utils/scraper.js";

// export  const  testview = (req, res) => {
//     res.send(" ho ok my friend that's it");
// }

/**
 * Selection de tous les stocks
 */
export const testview = async (req, res) => {
  try {
    const query = `
        SELECT * FROM stock
    `;
    const result = await Query.find(query);

    res.status(200).json(result);
  } catch (error) {
    res.json({ msg: error });
  }
};

/**
 * selection d'un stock par son isin et sa place de quotation
 */
export const displayOneStock = async (req, res) => {
  const { isin, place } = req.params;
  try {
    // recupération des champs du post
    const query = `
        SELECT *  
        FROM  stock
        WHERE stock.isin = ? AND stock.place = ? 
    `;
    const [result] = await Query.doByValues(query, { isin, place });

    const {before,last} = await scrapeAbc(result[0].ticker, result[0].place);

    result[0].last = last;
    result[0].before = before;

    console.log("myres",  result[0]);

    res.status(200).json({ result });
  } catch (error) {
    res.json({ msg: error });
  }
};
