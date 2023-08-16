import Query from "../model/query.js";




 /**
 * Retourne les trades actifs à partir du tableau des entrées et de celui des sorties.
 * 
 * @param {Array} opened - Tableau des trades ouverts.
 * @param {Array} closed - Tableau des trades fermés.
 * @returns {Array} Tableau des trades actifs.
 */
function activesOnly(opened, closed) {
  let activesTrades = [];

  for (const entry of opened) {
     
    let closureExist = false;
    let remains;

    for (const exit of closed) {
      if (exit.tradeId === entry.tradeId) {
        closureExist = true; // il existe une cloture pour le stock
        remains = entry.opened - exit.closed;
      }
    }
    if (closureExist === false) {
      remains = +entry.opened; // Si pas de sortie 
    }
    activesTrades.push({ idTrade: entry.tradeId, remains: remains });
  }
  return activesTrades;
}


/**
 * Sélection de tous les trades actifs (accessible uniquement aux administrateurs).
 * 
 * - Appel de la fonction 'activesOnly' pour filtrer et obtenir les trades actifs avec les quantités restantes.
 * - Renvoi de la liste des trades actifs en réponse.
 * 
 * @param {*} req - L'objet de la requête HTTP.
 * @param {*} res - L'objet de la réponse HTTP.
 */
export const getAll = async (req, res) => {
  try {
    // Requête SQL pour obtenir la somme des quantités ouvertes pour chaque trade.
    const queryOpened = `
      SELECT enter.trade_id AS tradeId, SUM(enter.quantity) AS opened
      FROM enter
      GROUP BY enter.trade_id
    `;

    // Requête SQL pour obtenir la somme des quantités fermées pour chaque trade.
    const queryClosed = `
      SELECT closure.trade_id AS tradeId, SUM(closure.quantity) AS closed
      FROM closure
      GROUP BY closure.trade_id
    `;

    // Exécution des requêtes
    const opened = await Query.find(queryOpened);
    const closed = await Query.find(queryClosed);

    // Filtrage des trades actifs en appelant la fonction 'activesOnly'
    let activesTrades = activesOnly(opened, closed);

    // Renvoi de la liste des trades actifs en réponse
    res.status(200).json(activesTrades);

  } catch (error) {
    // En cas d'erreur, renvoi d'un message d'erreur dans la réponse JSON
    res
      .status(500)
      .json({ msg: "Erreur lors de la récupération des trades actifs", error });
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
    let tradeList =  activesOnly(opened, closed);

    /// pour chaque trade on va chercher les détails
    for await (const item of tradeList) {
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

      // on alimente le tableau à  renvoyer
      activesTrades.push(actulizedTrade);

      console.log ("ici",activesTrades)

    }

     result = await activesTrades
     //console.log ("toto", result)
 
    // Renvoi de la liste des trades actifs avec leurs détails en réponse
    res.status(200).json(activesTrades);

  } catch (error) {
    // En cas d'erreur, renvoi d'un message d'erreur dans la réponse JSON
    res
      .status(500)
      .json({ msg: "Erreur lors de la récupération des trades actifs", error });
  }
};












/***********************************************************
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
      comment,
      strategy_id,
      portfolio_id,
      currency_id,
      lastQuote,
      beforeQuote,
      position,
    } = req.body;

    // création du trade puis de l'entrée
    let dateToSet = new Date();

    const query = `INSERT INTO trade ( stock_id, position, currentTarget, currentStop, comment, firstEnter, strategy_id ,  portfolio_id ,  currency_id ) 
        VALUES (?,?,?,?,?,?,?,?,?)`;
    const [result] = await Query.doByValues(query, {
      stock_id,
      position,
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
    const querryEnter = `INSERT INTO enter (date, price, target, stop, quantity, fees, tax, comment, trade_id)
        VALUES ( ?,?,?,?,?,?,?,?,? )`;
    await Query.doByValues(querryEnter, {
      dateToSet,
      price,
      target,
      stop,
      quantity,
      fees,
      tax,
      comment,
      idTrade,
    });

    // verifie si le stock est déja dans les trades actifs
    const queryCheck = `
      SELECT activeStock.stock_id  FROM activeStock 
      WHERE stock_id = ?
    `;
    const existShares = await Query.doByValue(queryCheck, stock_id);

    if (existShares.length === 0) {
      // pas d'enregistrement trouvé on en créé un
      const query = `INSERT INTO activeStock ( stock_id, lastQuote, beforeQuote) 
        VALUES (?,?,?)`;
      await Query.doByValues(query, {
        stock_id,
        lastQuote,
        beforeQuote,
      });
    }
    res.status(200).json("trade entré correctement");
  } catch (error) {
    res.json({ msg: error });
  }
};

/***********************************************************
 * Exit sur un trade -> données pour affichage du formulaire
 */
export const exitPrepare = async (req, res) => {
  const { tradeId } = req.params;

  try {
    // on cherhche toutes les entrées sur le trade
    const enterQuery = `Select SUM((enter.price * enter.quantity)+enter.fees+enter.tax) as enterValue, SUM(quantity) as enterQuantity
    FROM enter
    WHERE enter.trade_id = ?`;
    const [enter] = await Query.doByValue(enterQuery, tradeId);

    // on cherche toutes les sorties sur le trade
    const closureQuery = `Select COALESCE(SUM((closure.price * closure.quantity)+closure.fees+closure.tax),0) as closureValue, 
      COALESCE (SUM(quantity),0) as closureQuantity
      FROM closure
      WHERE closure.trade_id = ? `;
    const [closure] = await Query.doByValue(closureQuery, tradeId);

    // on déternime les paramètres du trade
    const tradeQuery = `SELECT DISTINCT stock.title, stock.isin AS isin, stock.id AS stock_id,
            stock.place AS place, stock.ticker AS ticker, 
            activeStock.lastQuote,
            trade.id as tradeId, trade.firstEnter, currentTarget as target, currentStop as stop, trade.comment, trade.position,
            portfolio.title  AS portfolio, portfolio.id AS portfolio_id
            FROM enter
            JOIN trade ON enter.trade_id = trade.id 
            JOIN stock ON trade.stock_id = stock.id 
            JOIN activeStock ON activeStock.stock_id = stock.id
            JOIN portfolio ON trade.portfolio_id = portfolio.id         
            WHERE trade.id = ?`;

    const [trade] = await Query.doByValue(tradeQuery, tradeId);

    const calculs = {
      pru: (enter.enterValue / enter.enterQuantity).toFixed(3),
      remains: +enter.enterQuantity - closure.closureQuantity,
      exposition: (
        (+enter.enterQuantity - closure.closureQuantity) *
        trade.lastQuote
      ).toFixed(3),
      //opToDo: (trade.position = "long" ? "sell" : "buy"),
    };

    const result = { ...enter, ...closure, ...calculs, ...trade };

    res.status(200).json(result);
  } catch (error) {
    res.json({ msg: error });
  }
};

/***********************************************************
 * ontraite la création d'une sortie  / exit process
 */
export const exitProcess = async (req, res) => {
  const {
    comment,
    date,
    fees,
    price,
    quantity,
    remains,
    stock_id,
    tax,
    trade_id,
  } = req.body;

  // transformation de la date
  //const dateParts = date.split("-");
  // Create a new Date object
  //const sqldate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
  // Get the current timestamp
  //const timestamp = sqldate.toISOString().slice(0, 19).replace("T", " ");

  try {
    // insersion de la cloture du trade
    const query = `INSERT INTO closure(date, price, quantity, fees, tax, comment, trade_id) VALUES (?,?,?,?,?,?,?) `;
    await Query.doByValues(query, {
      date,
      price,
      quantity,
      fees,
      tax,
      comment,
      trade_id,
    });

    // on cherhche le nombre de titre residuel

    const query2 = `SELECT SUM(quantity) AS nbEnter 
      FROM enter
      JOIN trade ON enter.trade_id = trade.id
      WHERE trade.stock_id = ?`;
    const [stocksEntered] = await Query.doByValue(query2, stock_id);

    const query3 = `SELECT COALESCE(SUM(quantity),0) as nbExit
      FROM closure
      JOIN trade ON closure.trade_id = trade.id 
      WHERE trade.stock_id = ? `;
    const [stocksExited] = await Query.doByValue(query3, stock_id);

    const stocksRemaining = stocksEntered.nbEnter - stocksExited.nbExit;

    // si plus de position -> on efface la ligne du suivi !!

    if (stocksRemaining < 1) {
      // si il ne reste pas de tritres alors on efface l'entrée des suivis
      const query4 = `DELETE FROM activeStock WHERE stock_id = ?`;
      await Query.doByValue(query4, stock_id);
    }
    res.status(200).json("exit  correct");
  } catch (error) {
    res.json({ msg: error });
  }
};

/***********************************************************
 * Re Enter sur un trade en cours
 */
export const reEnterProcess = async (req, res) => {
  const {
    comment,
    date,
    fees,
    price,
    quantity,
    stock_id,
    stop,
    target,
    tax,
    trade_id,
  } = req.body;

  try {
    // insertion d'une nouvelle enrtrée de trade
    const querryEnter = `INSERT INTO enter (date, price, target, stop, quantity, fees, tax, comment, trade_id)
        VALUES ( ?,?,?,?,?,?,?,?,? )`;
    await Query.doByValues(querryEnter, {
      date,
      price,
      target,
      stop,
      quantity,
      fees,
      tax,
      comment,
      trade_id,
    });
    //modification des stop et objectifs en fonction des nouveaux

    const query = `UPDATE trade
          SET currentTarget=?, currentStop=?, comment=? 
          WHERE id = ?`;
    await Query.doByValues(query, {
      target,
      stop,
      comment,
      trade_id,
    });

    res.status(200).json("trade entré correctement");
  } catch (error) {
    res.json({ msg: error });
  }
};

// verification de l'existance de trade actif (pour eviter les doublons)

export const checkIfActiveTrade = async (req, res) => {
  const { idStock, idPortfolio } = req.params;

  try {
    const query = `SELECT id FROM trade WHERE stock_id = ? and portfolio_id = ? `;

    const [existingTrades] = await Query.doByValues(query, {
      idStock,
      idPortfolio,
    });

    //(existingTrades); // tableau d'objet ex: [ { id: 114 }, { id: 120 } ]
    // pour chaque trade on va compter le nombre d'entrée et celui des sorties

    const activeTrade = [];

    for (const trade of existingTrades) {
      const queryEnter = `SELECT COALESCE(SUM(quantity),0)  as nbEnter  FROM enter WHERE trade_id = ?`;
      const queryClosure = `SELECT COALESCE(SUM(quantity),0) as nbClosure  FROM closure WHERE trade_id = ? `;
      const [enter] = await Query.doByValue(queryEnter, trade.id);
      const [closure] = await Query.doByValue(queryClosure, trade.id);
      const stockLeft = +enter.nbEnter - closure.nbClosure;
      //console.log(trade.id, stockLeft);
      if (stockLeft > 0) {
        activeTrade.push(trade.id);
      }
      //console.log(activeTrade);
    }
    res.status(200).json(activeTrade);
  } catch (error) {
    res.json({ msg: error });
  }
};
