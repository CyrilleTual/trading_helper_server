import Query from "../model/query.js";
import { scrapeAbc } from "../utils/scraper.js";
 

/*
 * Selection de tous le trades actifs  route /trade/active (pour admin uniquement)
 */
export const getAll = async (req, res) => {
  try {
    const query = `
        SELECT stock.title, stock.id  AS stockId,  
        trade.id  AS "tradeId" , 
        account.id  AS accountId , 
        user.id AS userID,
        count(closure.id ) , 
        SUM(enter.quantity), 
        SUM(closure.quantity),
        SUM(enter.quantity)- IF (count(closure.id ) > 0 , SUM(closure.quantity) , 0) AS quantity
        FROM enter
        JOIN trade ON enter.trade_id = trade.id 
        LEFT JOIN  closure ON closure.trade_id = trade.id
        JOIN stock ON trade.stock_id = stock.id 
        JOIN account ON trade.account_id = account.id 
        JOIN user ON account.user_id  = user.id 
        GROUP BY trade.id 
    `;
    const result = await Query.find(query);

    res.status(200).json(result);
  } catch (error) {
    res.json({ msg: error });
  }
};



/**
 * liste des trades actifs pour un user /trade/activeByUser/:id
 */
export const getByUser = async (req, res) => {
  const { userId } = req.params;

  try {

    // recherche des trades en cours 
    const query = `
        SELECT stock.title, stock.id  AS stockId,  stock.isin AS isin, stock.place AS place, stock.ticker AS ticker, 
        activeStock.lastQuote,
        trade.id  AS "tradeId" , trade.firstEnter, currentTarget, currentStop, trade.comment,
        account.id  AS accountId , 
        count(enter.id),
        SUM(  enter.quantity)- IF (count(closure.id ) > 0 , SUM(  closure.quantity) , 0) AS actualQuantity
        FROM enter
        JOIN trade ON enter.trade_id = trade.id 
        LEFT JOIN  closure ON closure.trade_id = trade.id
        JOIN stock ON trade.stock_id = stock.id 
        JOIN activeStock ON activeStock.stock_id = stock.id
        JOIN account ON trade.account_id = account.id 
        JOIN user ON account.user_id  = user.id 
        WHERE user.id = ?
        GROUP BY enter.trade_id
        HAVING actualQuantity > 0

        `;
    const result = await Query.doByValue(query, [userId]); // array of object
    console.log (result)

    let activesTrades = []; 

    // on traite chaque trade 
    for (const trade of result ) {
        let actulizedTrade = {
          title: trade.title,
          isin: trade.isin,
          place: trade.place,
          ticker: trade.ticker,
          lastQuote: trade.lastQuote,
          quantity: trade.actualQuantity,
          pru: 0,
          perf: 0,
          firstEnter: trade.firstEnter,
          currentTarget: trade.currentTarget,
          currentStop: trade.currentStop,
          comment: trade.comment,
        };

      //détermination du PRU
      const query2 = `SELECT SUM(price)+ SUM(commission) + SUM(tax) /  SUM(quantity) AS pru 
            FROM enter 
            WHERE trade_id = ?
            `;
      const [{pru}] = await Query.doByValue(query2, [trade.tradeId]); // array of object

      actulizedTrade.pru = pru; 
      actulizedTrade.perf = ((trade.lastQuote-pru)/pru);
      activesTrades.push(actulizedTrade);
    }
    res.status(200).json(activesTrades);
  } catch (error) {
    res.json({ msg: error });
  }
};
