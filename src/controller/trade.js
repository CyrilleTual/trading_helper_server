import Query from "../model/query.js";
import { checkAndDeleteIfResidual } from "./controllerFunctionsUtils.js";
import { newEntryInputCheck, reEnterInputCheck, exitInputCheck, adjustmentInputCheck }  from "./inputsValidationUtils.js"
import { lastTadeID, setNewLastUid } from "./prefsUser.js";
 

/**
 * Trie les trades en fonction de leur activité .
 * @param {Array} opened - Liste des trades ouverts.
 * @param {Array} closed - Liste des trades fermés.
 * @returns {Object} - Un objet contenant les trades actifs et fermés.
 */
export function SortTradesByActivity(opened, closed) {
  let activesTrades = []; // Liste pour les trades actifs
  let closedTrades = []; // Liste pour les trades fermés

  // Parcourt la liste des trades ouverts
  for (const entry of opened) {
    let closureExist = false; // Indique si une clôture existe pour ce trade
    let remains; // Nombre de stocks restant dans le trade

    // Parcourt la liste des trades fermés pour trouver une correspondance
    for (const exit of closed) {
      if (exit.tradeId === entry.tradeId) {
        closureExist = true; // il existe une cloture pour le stock
        remains = entry.opened - exit.closed;
      }
    }
    if (closureExist === false) {
      remains = +entry.opened; // Si pas de sortie
    }

    // Ajoute le trade à la liste correspondante (actif ou fermé) en fonction du nombre restant
    remains > 0
      ? activesTrades.push({ idTrade: entry.tradeId, remains: remains })
      : closedTrades.push({ idTrade: entry.tradeId, remains: remains });
  }

  return { activesTrades, closedTrades }; // Retourne un objet contenant les trades actifs et fermés
}


/**
 * Sélection de tous les trades actifs (accessible uniquement aux administrateurs).
 * 
 * - Appel de la fonction 'SortTradesByActivity' pour filtrer et obtenir les trades actifs avec les quantités restantes.
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

    // Filtrage des trades actifs en appelant la fonction 'SortTradesByActivity'
    const { activesTrades, closedTrades } = SortTradesByActivity(
      opened,
      closed
    );

    // Renvoi de la liste des trades actifs en réponse
    res.status(200).json(activesTrades);

  } catch (error) {
    // En cas d'erreur, renvoi d'un message d'erreur dans la réponse JSON
    res
      .status(500)
      .json({ msg: "Erreur lors de la récupération des trades actifs", error });
  }
};


/**
 * Obtient les détails des trades ouverts.
 * @param {Array} opensTradesList - Liste des trades ouverts.
 * @returns {Array} - Liste des trades ouverts avec leurs détails.
 */
// async function getDetailsOfOpensTrades(opensTradesList) {
//   let activesTrades = [];
//   // Parcourt la liste des trades ouverts
//   for (const [index, item] of opensTradesList.entries()) {
//     // Ajoute les détails du trade actualisé à la liste des trades actifs
//     activesTrades.push (await actualisation(item));
//      if (index === (opensTradesList.length - 1)) {
//        return (activesTrades);
//      }
//   }
// }

/**
 * Obtient les détails des trades ouverts.
 * @param {Array} opensTradesList - Liste des trades ouverts.
 * @returns {Array} - Liste des trades ouverts avec leurs détails.
 */
async function getDetailsOfOpensTrades(opensTradesList) {
  let detailledTrades = [];
  for (const trade of opensTradesList) {
    detailledTrades.push(await actualisation(trade));
  }
  return detailledTrades;
}


/**
 * Actualise les détails d'un trade.
 * @param {Object} item - Informations sur le trade (contient id et remains).
 * @returns {Object} - Détails actualisés du trade.
 */
async function actualisation(item) {

  // Requête pour obtenir les détails du trade
  const query = `
    SELECT DISTINCT stock.title, stock.id AS stockId, stock.isin AS isin, stock.place AS place, stock.ticker AS ticker, 
    activeStock.lastQuote, activeStock.currencySymbol As symbol, activeStock.beforeQuote As beforeQuote, activeStock.updDate updDate,
    trade.firstEnter, currentTarget, currentStop, trade.uidForUser, trade.comment, trade.position as position, trade.id AS tradeId,
    portfolio.id AS portfolioId, portfolio.title AS portfolio, trade.strategy_id AS strategyId, strategy.title AS strategy
    FROM enter
    JOIN trade ON enter.trade_id = trade.id 
    JOIN stock ON trade.stock_id = stock.id 
    JOIN activeStock ON activeStock.stock_id = stock.id
    JOIN portfolio ON trade.portfolio_id = portfolio.id 
    JOIN user ON portfolio.user_id = user.id 
    JOIN strategy ON trade.strategy_Id = strategy.id
    WHERE trade.id = ?
  `;

  // Exécute la requête pour obtenir les détails du trade
  const [trade] = await Query.doByValue(query, item.idTrade);

  // Requête pour informations sur les entrées
  const queryEnter = `
    SELECT SUM(price*quantity) AS totalCost,  (SUM(fees) + SUM(tax))  AS enterTaxs, SUM(quantity) AS quantityBought, 
    (SUM(price*quantity) + SUM(fees) + SUM(tax)) / SUM(quantity) AS pru
    FROM enter
    WHERE trade_id = ?
  `;

  // Exécute la requête pour obtenir les entrées
  const [{ totalCost, enterTaxs, quantityBought, pru }] = await Query.doByValue(
    queryEnter,
    [item.idTrade]
  );

  // Requête pour informations sur les sorties
  const queryClosure = `
    SELECT COALESCE(SUM(price*quantity),0) AS totalSold,  
      COALESCE ((SUM(fees) + SUM(tax)),0) AS closureTaxs,
      COALESCE(SUM(quantity),0) AS quantitySold, 
      COALESCE((SUM(price*quantity) + SUM(fees) + SUM(tax)) / SUM(quantity),0) AS pvu
    FROM closure
    WHERE trade_id = ?

  `;

  // Exécute la requête pour obtenir les sorties
  const [{ totalSold, closureTaxs, quantitySold, pvu }] = await Query.doByValue(
    queryClosure,
    [item.idTrade]
  );

  // calcul du point de neutralité -> cours où l'on est neutre ni en gain, ni en perte 
  let neutral = null
  trade.position === "long" ?  neutral = +pru : neutral =  (+totalCost-enterTaxs )/+quantityBought

  // détermination du statut du trade en cours : OnGoing, OnStop, OnTarget 
  let status = "OnGoing";
  if (trade.position === "long" && +trade.lastQuote > +trade.currentTarget) {
    status = "OnTarget";
  } else if (trade.position === "long" && +trade.lastQuote < +trade.currentStop) {
    status = "OnStop";
  } else if (
    trade.position === "short" &&
    +trade.lastQuote < +trade.currentTarget
  ) {
    status = "OnTarget";
  } else if (
    trade.position === "short" &&
    +trade.lastQuote > +trade.currentStop
  ) {
    status = "OnStop";
  }

  // const pruTest = ((+totalCost+(+enterTaxs)) / +quantityBought)
  // console.log ("cout",+totalCost, "taxes ",+enterTaxs, "quantite", +quantityBought, "pruTest", pruTest,"pru",pru, "neutral",neutral)
 //console.log(trade.position, pru, pruTest, neutral);

  // Crée un objet avec les détails actualisés du trade
  let actulizedTrade = {
    portfolioId: trade.portfolioId,
    portfolio: trade.portfolio,
    title: trade.title,
    isin: trade.isin,
    stockId: trade.stockId,
    place: trade.place,
    ticker: trade.ticker,
    position: trade.position,
    enterTotalK: +totalCost,
    enterTaxs: +enterTaxs,
    enterQuantity: +quantityBought,
    pru: +pru,
    closureTotalK: +totalSold,
    closureTaxs: +closureTaxs,
    closureQuantity: +quantitySold,
    pvu: +pvu,
    lastQuote: +trade.lastQuote,
    beforeQuote: +trade.beforeQuote,
    actualQuantity: +item.remains,
    perf: +Number.parseFloat(((trade.lastQuote - pru) / pru) * 100).toFixed(2),
    firstEnter: trade.firstEnter,
    target: +trade.currentTarget,
    stop: +trade.currentStop,
    currentComment: trade.comment,
    symbol: trade.symbol,
    upd: trade.updDate,
    strategyId: trade.strategyId,
    strategy: trade.strategy,
    tradeId: trade.tradeId,
    neutral: +neutral,
    status: status,
    uidForUser: trade.uidForUser,

  };

  return actulizedTrade;
}


/**
 * Récupère le détails des trades ouverts pour un user 
 * @param {*} req - Requête HTTP.
 * @param {*} res - Réponse HTTP.
 */
export const getActivesByUser = async (req, res) => {

  // id de l'utilisateur  pour lequel on veut recupérer les trades 
  const { userId } = req.params;

  try {
    // Requête pour obtenir les trades ouverts par l'utilisateur
    const queryOpened = `
      SELECT enter.trade_id AS tradeId, SUM(enter.quantity) AS opened
      FROM enter
      JOIN trade ON enter.trade_id = trade.id
      JOIN portfolio ON trade.portfolio_id = portfolio.id
      JOIN user ON portfolio.user_id = user.id
      WHERE user.id = ?
      GROUP BY enter.trade_id
    `;

    // Requête pour obtenir les trades fermés par l'utilisateur
    const queryClosed = `
      SELECT closure.trade_id AS tradeId, SUM(closure.quantity) AS closed
      FROM closure
      JOIN trade ON closure.trade_id = trade.id
      JOIN portfolio ON trade.portfolio_id = portfolio.id
      JOIN user ON portfolio.user_id = user.id
      WHERE user.id = ?
      GROUP BY closure.trade_id
    `;

    // Exécute les requêtes pour obtenir les trades ouverts et fermés
    const opened = await Query.doByValue(queryOpened, [userId]);
    const closed = await Query.doByValue(queryClosed, [userId]);

    // Détermine la liste des trades actifs en fonction des trades ouverts et fermés
    let { activesTrades } = SortTradesByActivity(opened, closed);

    // Obtenir les détails des trades actifs
    let activesTradesDetails = await getDetailsOfOpensTrades(activesTrades);

    // Renvoi de la liste des trades actifs avec leurs détails en réponse JSON
    res.status(200).json(activesTradesDetails);
  } catch (error) {
    // En cas d'erreur, renvoi d'un message d'erreur dans la réponse JSON
    res
      .status(500)
      .json({ msg: "Erreur lors de la récupération des trades actifs", error });
  }
};


/**
 * Crée un nouveau trade avec une entrée initiale.
 * @param {*} req - Requête HTTP.
 * @param {*} res - Réponse HTTP.
 */
export const newEntry = async (req, res) => {

  try {

    // recuperation de l'id de l'user via le token
    const token = req.headers["x-access-token"];
    const { id : userId} = JSON.parse(atob(token.split(".")[1]));

    // recupération du dernier uid de trade pour l'user et incrémentation 
    const uidForUser =( await (lastTadeID(userId)))+1; 
    //  modification du dernier uid dans les prefsUser
    setNewLastUid(userId, uidForUser); 

    const { inputsErrors, verifiedValues } = await newEntryInputCheck(
      req.body,
      res
    );

    if (inputsErrors.length > 0) {
      // il y a des erreurs
      res.status(403).json({
        msg: "Requête incorrecte, création rejetée",
      });
      return;
    } else {
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
        currency_abbr,
        lastQuote,
        beforeQuote,
        position,
        currency_symbol,
        date,
      } = verifiedValues;

      // Crée la date de l'entrée initiale
      let dateToSet = new Date(date);


      // Crée le nouveau trade et récupère son ID
      const query = `INSERT INTO trade ( uidForUser, stock_id, position, currentTarget, currentStop, comment, firstEnter, strategy_id ,  portfolio_id ,  currency_abbr ) 
        VALUES (?,?,?,?,?,?,?,?,?,?)`;
      const [result] = await Query.doByValues(query, {
        uidForUser,
        stock_id,
        position,
        target,
        stop,
        comment,
        dateToSet,
        strategy_id,
        portfolio_id,
        currency_abbr,
      });
      const idTrade = result.insertId;

      // Crée l'entrée initiale liée au trade (comments identiques, objectifs et target idem)
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
        /// Si pas d'enregistrement trouvé, crée un nouveau dans activeStock
        const query = `INSERT INTO activeStock ( stock_id, lastQuote, beforeQuote, currencySymbol) 
        VALUES (?,?,?,?)`;
        await Query.doByValues(query, {
          stock_id,
          lastQuote,
          beforeQuote,
          currency_symbol,
        });
      }
      res.status(200).json("trade entré correctement");
    }
  } catch (error) {
    res.json({ msg: error });
  }
};


/**
 * Prépare les données pour afficher le formulaire de sortie ou de re-enter d'un trade.
 * @param {*} req - Requête HTTP.
 * @param {*} res - Réponse HTTP.
 */
// export const exitPrepare = async (req, res) => {
//   const { tradeId } = req.params;

//   try {
//     // on cherhche toutes les entrées sur le trade
//     const enterQuery = `Select SUM((enter.price * enter.quantity)+enter.fees+enter.tax) as enterValue, SUM(quantity) as enterQuantity
//     FROM enter
//     WHERE enter.trade_id = ?`;
//     const [enter] = await Query.doByValue(enterQuery, tradeId);

//     // on cherche toutes les sorties sur le trade
//     const closureQuery = `Select COALESCE(SUM((closure.price * closure.quantity)+closure.fees+closure.tax),0) as closureValue, 
//       COALESCE (SUM(quantity),0) as closureQuantity
//       FROM closure
//       WHERE closure.trade_id = ? `;
//     const [closure] = await Query.doByValue(closureQuery, tradeId);

//     // on cherche les informations du trade
//     const tradeQuery = `SELECT DISTINCT stock.title, stock.isin AS isin, stock.id AS stock_id,
//             stock.place AS place, stock.ticker AS ticker, 
//             activeStock.lastQuote, activeStock.currencySymbol as symbol,
//             trade.id as tradeId, trade.firstEnter, currentTarget as target, currentStop as stop, trade.comment, trade.position,
//             portfolio.title  AS portfolio, portfolio.id AS portfolio_id
//             FROM enter
//             JOIN trade ON enter.trade_id = trade.id 
//             JOIN stock ON trade.stock_id = stock.id 
//             JOIN activeStock ON activeStock.stock_id = stock.id
//             JOIN portfolio ON trade.portfolio_id = portfolio.id         
//             WHERE trade.id = ?`;

//     const [trade] = await Query.doByValue(tradeQuery, tradeId);

//     // Calculs pour affichage 
//     const calculs = {
//       pru: (enter.enterValue / enter.enterQuantity).toFixed(3),
//       remains: +enter.enterQuantity - closure.closureQuantity,
//       exposition: (
//         (+enter.enterQuantity - closure.closureQuantity) *
//         trade.lastQuote
//       ).toFixed(3),
//       //opToDo: (trade.position = "long" ? "sell" : "buy"),
//     };

//     // aggrégation des données et calculs 
//     const result = { ...enter, ...closure, ...calculs, ...trade };

//     res.status(200).json(result);
//   } catch (error) {
//     res.json({ msg: error });
//   }
// };

/**
 * Traite la création d'une sortie / closure
 * @param {*} req - Requête HTTP.
 * @param {*} res - Réponse HTTP.
 */
export const exitProcess = async (req, res) => {
  
  const { inputsErrors, verifiedValues } = await exitInputCheck(req.body, res);

  if (inputsErrors.length > 0) {
    // il y a des erreurs
    res.status(403).json({
      msg: "Requête incorrecte, création rejetée",
    });
    return;
  } else {
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
    } = verifiedValues;

        // transformation de la date
        //const dateParts = date.split("-");
        // Create a new Date object
        //const sqldate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
        // Get the current timestamp
        //const timestamp = sqldate.toISOString().slice(0, 19).replace("T", " ");

    try {
      // insersion de la cloture du trade
      const query = `
        INSERT INTO closure(date, price, quantity, fees, tax, comment, trade_id) 
        VALUES (?,?,?,?,?,?,?) 
      `;
      await Query.doByValues(query, {
        date,
        price,
        quantity,
        fees,
        tax,
        comment,
        trade_id,
      });

      // Rechercher le nombre de titre residuel
      const query2 = `
        SELECT SUM(quantity) AS nbEnter 
        FROM enter
        JOIN trade ON enter.trade_id = trade.id
        WHERE trade.stock_id = ?
      `;
      const [stocksEntered] = await Query.doByValue(query2, stock_id);

      const query3 = `
        SELECT COALESCE(SUM(quantity),0) as nbExit
        FROM closure
        JOIN trade ON closure.trade_id = trade.id 
        WHERE trade.stock_id = ? 
      `;
      const [stocksExited] = await Query.doByValue(query3, stock_id);

      const stocksRemaining = stocksEntered.nbEnter - stocksExited.nbExit;

      // Si il n'y a plus de position active on efface la ligne du suivi !!
      if (stocksRemaining < 1) {
        const query4 = `DELETE FROM activeStock WHERE stock_id = ?`;
        await Query.doByValue(query4, stock_id);
      }

    res.status(200).json("Sortie correcte");

    } catch (error) {
      res.json({ msg: error });
    }
  }
};






/**
 * Re-Enter dans un trade en cours
 * @param {*} req - Requête HTTP.
 * @param {*} res - Réponse HTTP.
 */
export const reEnterProcess = async (req, res) => {

  try {
 
    const { inputsErrors, verifiedValues } = await reEnterInputCheck(req.body, res);

    if (inputsErrors.length > 0) {  // il y a des erreurs 
      res.status(403).json({
      msg: "Requête incorrecte, création rejetée",
      });
      return;
    }else{ 

      // Récupérer les informations  
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
      } = verifiedValues;
 
      // Insérer une nouvelle entrée de trade
      const querryEnter = `
        INSERT INTO enter (date, price, target, stop, quantity, fees, tax, comment, trade_id)
        VALUES ( ?,?,?,?,?,?,?,?,? )
      `;
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

      // Modification des stops et objectifs en fonction des nouveaux
      const queryUpd = `
        UPDATE trade
        SET currentTarget=?, currentStop=?, comment=? 
        WHERE id = ?
      `;
      await Query.doByValues(queryUpd, {
        target,
        stop,
        comment,
        trade_id,
      });

      res.status(200).json("Trade ré-entré correctement");

    }

  } catch (error) {
    res.json({ msg: error });
  }
};

/**
 * Ajustement un trade en cours
 * @param {*} req - Requête HTTP.
 * @param {*} res - Réponse HTTP.
 */
export const adjustmentProcess = async (req, res) => {

  try {


    const { inputsErrors, verifiedValues } = await adjustmentInputCheck(
      req.body,
      res
    );


    if (inputsErrors.length > 0) {  // il y a des erreurs 
      res.status(403).json({
      msg: "Requête incorrecte, opération rejetée",
      });
      return;
    }else{ 

      // Récupérer les informations  
      const {
        comment,
        date,
        stop,
        target,
        trade_id,
      } = verifiedValues;


      // Insérer une nouvelle entrée d'ajustement'
      const querryEnter = `
        INSERT INTO adjustment (date, target, stop, comment, trade_id)
        VALUES ( ?,?,?,?,? )
      `;
      await Query.doByValues(querryEnter, {
        date,
        target,
        stop,
        comment,
        trade_id,
      });

      // Modification des stops et objectifs en fonction des nouveaux
      const queryUpd = `
        UPDATE trade
        SET currentTarget=?, currentStop=?, comment=? 
        WHERE id = ?
      `;
      await Query.doByValues(queryUpd, {
        target,
        stop,
        comment,
        trade_id,
      });

      res.status(200).json("Ajustement correct");

    }

  } catch (error) {
    res.json({ msg: error });
  }
};




/**
 * Vérifie l'existence d'un trade actif (pour éviter les doublons).
 * @param {*} req - Requête HTTP.
 * @param {*} res - Réponse HTTP.
 */
export const checkIfActiveTrade = async (req, res) => {

  const { idStock, idPortfolio } = req.params;

  try {
    // Requête pour trouver les trades existants (avec le stock_id et le portfolio_id )
    const query = `
      SELECT id FROM trade 
      WHERE stock_id = ? and portfolio_id = ? 
    `;

    const [existingTrades] = await Query.doByValues(query, {
      idStock,
      idPortfolio,
    });

    //(existingTrades); // tableau d'objet ex: [ { id: 114 }, { id: 120 } ]
    // Pour chaque trade, comptez le nombre d'entrées et de fermetures
    // Si il existe des trades actifs les stocker dans le trableau activeTrade

    const activeTrade = [];

    // Pour chaque trade existant verifie si est actif ou non
    for (const trade of existingTrades) {
      // Requête pour obtenir la somme des quantités d'entrée pour ce trade
      const queryEnter = `
        SELECT COALESCE(SUM(quantity),0)  as nbEnter  
        FROM enter 
        WHERE trade_id = ?
      `;
      // Requête pour obtenir la somme des quantités de fermeture pour ce trade
      const queryClosure = `
        SELECT COALESCE(SUM(quantity),0) as nbClosure  
        FROM closure 
        WHERE trade_id = ? 
      `;
      // Exécution des requêtes pour obtenir les quantités d'entrée et de fermeture
      const [enter] = await Query.doByValue(queryEnter, trade.id);
      const [closure] = await Query.doByValue(queryClosure, trade.id);

      // Calcul du stock restant en portefeuille pour ce trade
      const stockLeft = +enter.nbEnter - closure.nbClosure;

      // Si des stocks restent en portefeuille, le trade est considéré comme actif
      if (stockLeft > 0) {
        activeTrade.push(trade.id);
      }
      //console.log(activeTrade);
    }

    /// Retourne le tableau des IDs de trades actifs en réponse
    res.status(200).json(activeTrade);
    
  } catch (error) {
    res.json({ msg: error });
  }
};

/**
 * retourne un objets avec les array des entrees, sorties et mouvements sur un trade
 * @param {*} req  doit contenir tradeId 
 * @param {*} res 
 */
export const movements = async (req, res ) => {

  const { tradeId } = req.params;
 
  try {
    const queryEnter = `
        SELECT *
        FROM enter 
        WHERE trade_id = ?
      `;

    const queryClosure = `
        SELECT *
        FROM closure 
        WHERE trade_id = ? 
      `;
    const queryAdjustment = `
        SELECT *
        FROM adjustment
        WHERE trade_id = ? 
      `;

    // Exécution des requêtes pour obtenir les quantités d'entrée et de fermeture
    const enter = await Query.doByValue(queryEnter, tradeId);
    const closure = await Query.doByValue(queryClosure, tradeId);
    const adjustment = await Query.doByValue(queryAdjustment, tradeId);

    /// Retourne un objets avec les array des entrees, sorties et mouvements sur un trade
    res.status(200).json({ enter:enter, closure:closure, adjustment:adjustment});
  } catch (error) {
     res.json({ msg: error });
  }
}



/**
 * Delete d'un trade et des entrées, sorties et mouvements associés 
 * @param {*} req doit contenir tradeId 
 * @param {*} res 
 */
export const deleteTrade = async (req, res) => {
  const { tradeId } = req.params;
  try {

    // Requête SQL pour obtenir l'id du stock
    const queryIdStock = `
        SELECT stock_id
        FROM trade
        WHERE id = ?
      `;

    // suppression des entrées
    const queryEnter = `
        DELETE
        FROM enter 
        WHERE trade_id = ?
      `;
    // suppression des sorties
    const queryClosure = `
        DELETE
        FROM closure 
        WHERE trade_id = ? 
      `;

    // suppression des ajustements
    const queryAdjustment = `
        DELETE
        FROM adjustment
        WHERE trade_id = ? 
      `;

    // suppression du trade
    const queryTrade = `
        DELETE
        FROM trade
        WHERE id = ? 
      `;

    // Exécution des requêtes
    const [{ stock_id }] = await Query.doByValue(queryIdStock, tradeId);

    await Query.doByValue(queryEnter, tradeId);
    await Query.doByValue(queryClosure, tradeId);
    await Query.doByValue(queryAdjustment, tradeId);       
    await Query.doByValue(queryTrade, tradeId);

    // appel de la function qui verifie l'absence de trade résiduel sur un actif
    // et qui supprime cet actif du tableau de suivi si besoin
    checkAndDeleteIfResidual(stock_id);

    res.status(200).json({ msg: " deleted completed" });
  } catch (error) {
    // Log the error and return an error response
    console.error("Error deleting data:", error);
    res.status(500).json({ msg: "Deletion failed", error: error.message });
  }
};
