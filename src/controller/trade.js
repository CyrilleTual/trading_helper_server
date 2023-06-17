import Query from "../model/query.js";

/***********************************************************
 * retourne les trades actifs à partir des tableaux
 * des entrées et de celui des sorties
 */
function activesOnly(opened, closed) {
  let activesTrades = [];
  for (const element1 of opened) {
    let flag = false;
    let remains;
    for (const element2 of closed) {
      if (element2.tradeId === element1.tradeId) {
        flag = true;
        remains = element1.opened - element2.closed;
      }
    }
    if (flag === false) {
      remains = +element1.opened;
    }
    activesTrades.push({ idTrade: element1.tradeId, remains: remains });
  }
  return activesTrades;
}

/* *********************************************************
 * Selection de tous le trades actifs  route: /trade/active (pour admin uniquement)
 */
export const getAll = async (req, res) => {
  try {
    const queryOpened = `SELECT enter.trade_id AS tradeId, SUM(enter.quantity) AS opened
        FROM enter
        GROUP BY enter.trade_id`;

    const queryClosed = `SELECT closure.trade_id AS tradeId, SUM(closure.quantity) AS closed
        FROM closure
        GROUP BY closure.trade_id`;

    const opened = await Query.find(queryOpened);
    const closed = await Query.find(queryClosed);
    let activesTrades = activesOnly(opened, closed);

    res.status(200).json(activesTrades);
  } catch (error) {
    res.json({ msg: error });
  }
};

/***********************************************************
 * liste des trades actifs pour un user /trade/activeByUser/:id
 */
export const getByUser = async (req, res) => {
  const { userId } = req.params;
  let activesTrades = []; // array à retourner

  try {
    // array des trades ouverts par le user
    const queryOpened = `SELECT enter.trade_id AS tradeId, SUM(enter.quantity) AS opened
        FROM enter
        JOIN trade ON enter.trade_id = trade.id
        JOIN portfolio ON trade.portfolio_id = portfolio.id
        JOIN user ON portfolio.user_id = user.id
        WHERE user.id = ?
        GROUP BY enter.trade_id`;

    // array des trades fermés par le user
    const queryClosed = `SELECT closure.trade_id AS tradeId, SUM(closure.quantity) AS closed
        FROM closure
        JOIN trade ON closure.trade_id = trade.id
        JOIN portfolio ON trade.portfolio_id = portfolio.id
        JOIN user ON portfolio.user_id = user.id
        WHERE user.id = ?
        GROUP BY closure.trade_id`;

    const opened = await Query.doByValue(queryOpened, [userId]);
    const closed = await Query.doByValue(queryClosed, [userId]);

    // on va en déduire le tableau des trades actifs
    let tradeList = activesOnly(opened, closed);

    /// pour chaque trade on va chercher les détails
    for (const item of tradeList) {
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
      const queryPru = `SELECT SUM(price)+ SUM(fees) + SUM(tax) /  SUM(quantity) AS pru
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

      // on alimente le tableau à  renvoyer
      activesTrades.push(actulizedTrade);
    }

    res.status(200).json(activesTrades);
  } catch (error) {
    res.json({ msg: error });
  }
};


/**
 * Nouveau trade -> création du trade ET d'une entrée (l'entrée initiale)
 */
export const newEntry = async (req, res) => {
  try {
    const {
      stock_id,
      price,
      target,
      stop,
      quantity,
      fees,
      tax,
      parity,
      comment,
      strategy_id,
      portfolio_id,
      currency_id,
    } = req.body;

    // création du trade puis de l'entrée
    let dateToSet = new Date();

    const query = `INSERT INTO trade ( stock_id, currentTarget, currentStop, comment, firstEnter, strategy_id ,  portfolio_id ,  currency_id ) 
        VALUES (?,?,?,?,?,?,?,?)`;
    const [result] = await Query.doByValues(query, {
      stock_id,
      target,
      stop,
      comment,
      dateToSet,
      strategy_id,
      portfolio_id,
      currency_id,
    });
    const idTrade = result.insertId;

    // création de l'entrée initiale en lien avec le trade  (comments identiques, objectifs et target idem)
    const querryEnter = `INSERT INTO enter (date, price, target, stop, quantity, fees, tax, parity, comment, trade_id)
        VALUES ( ?,?,?,?,?,?,?,?,?,? )`;
    await Query.doByValues(querryEnter, {
      dateToSet,
      price,
      target,
      stop,
      quantity,
      fees,
      tax,
      parity,
      comment,
      idTrade,
    });
    res.status(200).json("coucou");
  } catch (error) {
    res.json({ msg: error });
  }
};
