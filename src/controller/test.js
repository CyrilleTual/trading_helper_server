import Query from "../model/query.js";
import {  scrapeLastInfos } from "../utils/scraper.js";
import { activesOnly } from "./trade.js";

// export  const  testview = (req, res) => {
//     res.send(" ho ok my friend that's it");
// }

/**
 * Selection de tous les stocks
 */
// export const testview = async (req, res) => {
//   try {
//     const query = `
//         SELECT * FROM stock
//     `;
//     const result = await Query.find(query);

//     res.status(200).json(result);
//   } catch (error) {
//     res.json({ msg: error });
//   }
// };

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


async function actualisation (item)  {


   const query = `
        SELECT DISTINCT stock.title, stock.id  AS stockId,  stock.isin AS isin, stock.place AS place, stock.ticker AS ticker, 
        activeStock.lastQuote,
        trade.firstEnter, currentTarget, currentStop, trade.comment,
        portfolio.id  AS portfolioId 
        FROM enter
        JOIN trade ON enter.trade_id = trade.id 
        JOIN stock ON trade.stock_id = stock.id 
        JOIN activeStock ON activeStock.stock_id = stock.id
        JOIN portfolio ON trade.portfolio_id = portfolio.id 
        JOIN user ON portfolio.user_id  = user.id 
        WHERE trade.id = ?
      `;
      const [trade] = await Query.doByValue(query, item.idTrade); // array of object

      let actulizedTrade = {
        title: trade.title,
        isin: trade.isin,
        place: trade.place,
        ticker: trade.ticker,
        lastQuote: trade.lastQuote,
        quantity: item.remains,
        pru: 0,
        perf: 0,
        firstEnter: trade.firstEnter,
        currentTarget: trade.currentTarget,
        currentStop: trade.currentStop,
        comment: trade.comment,
      };

      //détermination du PRU
      const queryPru = `
        SELECT SUM(price)+ SUM(fees) + SUM(tax) /  SUM(quantity) AS pru
        FROM enter
        WHERE trade_id = ?
      `;
      const [{ pru }] = await Query.doByValue(queryPru, [item.idTrade]);

      // on complète et formate les informations à renvoyer
      actulizedTrade.firstEnter = new Date(trade.firstEnter).toLocaleDateString(
        "fr-FR"
      );
      actulizedTrade.pru = Number.parseFloat(pru).toFixed(3);
      actulizedTrade.perf = `${Number.parseFloat(
        (trade.lastQuote - pru) / pru
      ).toFixed(2)} %`;

      return (actulizedTrade)
}





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
    let tradeList = activesOnly(opened, closed);
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
