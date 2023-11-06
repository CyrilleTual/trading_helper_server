import Query from "../model/query.js";
import {  scrapeLastInfos } from "../utils/scraper.js";
import { SortTradesByActivity } from "./trade.js";


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

    const {before,last} = await  scrapeLastInfos(result[0].ticker, result[0].place);

    result[0].last = last;
    result[0].before = before;

    res.status(200).json({ result });
  } catch (error) {
    res.json({ msg: error });
  }
};







async function getDetailsOfOpensTrades (opensTradesList) {

  let activesTrades = []

  //  for (let i = 0; i < opensTradesList.length; i++) {
  //    const detailsActive = await actualisation(opensTradesList[i]);
  //    activesTrades.push( detailsActive);
  //  }

   for ( const item of opensTradesList) {
    activesTrades.push(await actualisation(item))
   }

  console.log("la", activesTrades);
}







/***********************************************************
 * liste des trades actifs pour un user /trade/activeByUser/:id
 */
export const testview = async (req, res) => {

  const userId = 1 ;
  let activesTrades = []; // array à retourner

  try {
    // array des trades ouverts par le user
    const queryOpened = `
      SELECT enter.trade_id AS tradeId, SUM(enter.quantity) AS opened
      FROM enter
      JOIN trade ON enter.trade_id = trade.id
      JOIN portfolio ON trade.portfolio_id = portfolio.id
      JOIN user ON portfolio.user_id = user.id
      WHERE user.id = ?
      GROUP BY enter.trade_id
    `;
    // array des trades fermés par le user
    const queryClosed = `
      SELECT closure.trade_id AS tradeId, SUM(closure.quantity) AS closed
      FROM closure
      JOIN trade ON closure.trade_id = trade.id
      JOIN portfolio ON trade.portfolio_id = portfolio.id
      JOIN user ON portfolio.user_id = user.id
      WHERE user.id = ?
      GROUP BY closure.trade_id
    `;
    const opened = await Query.doByValue(queryOpened, [userId]);
    const closed = await Query.doByValue(queryClosed, [userId]);
    // on va en déduire le tableau des trades actifs
    let tradeList = SortTradesByActivity(opened, closed);
    //console.log("coucou", opened, closed, tradeList);


    /// pour chaque trade actif  on va chercher les détails

    const detailsOfOpensTrades = await getDetailsOfOpensTrades(tradeList);
   







    // Renvoi de la liste des trades actifs avec leurs détails en réponse
    res.status(200).json(activesTrades);
  } catch (error) {
    // En cas d'erreur, renvoi d'un message d'erreur dans la réponse JSON
    res
      .status(500)
      .json({ msg: "Erreur lors de la récupération des trades actifs", error });
  }
};
