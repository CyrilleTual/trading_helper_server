import Query from "../model/query.js";

/**
 * Création d'un nouveau portefeuille
 */
export const newPortfolio = async (req, res) => {
  try {
    const { title, comment, deposit, user_id, currency_id, status } = req.body;

    const query = `INSERT INTO portfolio (title, comment, user_id,          currency_id, status  ) 
      VALUES (?,?,?,?,?)`;
    const [result] = await Query.doByValues(query, {
      title,
      comment,
      user_id,
      currency_id,
      status,
    });

    // ensuite faire un versement 
    const idPort = await result.insertId;
    const query2 = `INSERT INTO deposit(porfolio_id, amount) VALUES (?,?)`;
    await Query.doByValues(query2, {
    idPort,
    deposit,
    });
    res.status(200).json({ msg: "portefeuille créé" });
  } catch (error) {
    res.json({ msg: error });
  }
};



//**********************************************************
//* liste des portfolios pour un user (userId)
//*
export const getPortfoliosByUser = async (req, res) => {
  const { userId } = req.params;
  try {
    const query = `SELECT portfolio.id, portfolio.title, portfolio.comment, 
      currency.id as currencyId, currency.title as currency 
      FROM portfolio
      JOIN currency on portfolio.currency_id = currency.id
      WHERE user_id = ?`;
    const portfolios = await Query.doByValue(query, userId);
    res.status(200).json(portfolios);
  } catch (error) {
    res.json({ msg: error });
  }
};

/**
 * informations d'un portfolio par id  
 */
const portfolioInfos = async (id) => {
 const query = `
   SELECT title, comment, user_id as userId, currency_id as currencyId FROM portfolio 
   WHERE  id=?
    `;
  const result = await Query.doByValue(query, id);
  return result[0];
}



//**********************************************************
//* Determination de l'apport total de cash pour un portfolio
//*
const initial = async (id) => {
  const query = `
   SELECT SUM(deposit.amount) as totalDeposit FROM deposit 
   WHERE  deposit.porfolio_id=?
    `;
  const result = await Query.doByValue(query, id);

  return result[0].totalDeposit;
};

// apport en cash Global pour tout les comptes ***************************
const initialGlobal = async (id) => {
  const query = `
   SELECT SUM(amount) as deposit FROM  deposit
    `;
  const result = await Query.find(query);
  return result[0].deposit;
};




//**********************************************************
//* Determination de l'apport total de cash pour un user
//*
const initialByUser = async (id) => {
  const query = `
    SELECT SUM(deposit.amount) as totalDeposit FROM deposit 
    JOIN portfolio ON deposit.porfolio_id = portfolio.id
    WHERE  portfolio.user_id = ?
    `;
  const result = await Query.doByValue(query, id);
  return result[0].totalDeposit;
};

async function opened(idPortfolio) {
  /**
   * selection de tous les trades  qui ont été  ouverts pour un portfolios
   */
  const query = `
        select enter.trade_id as tradeId, SUM(enter.quantity) as quantity, 
        SUM(price*quantity) as totalEnterK, SUM(fees+tax) as totalEnterTaxs, trade.position
        FROM enter
        JOIN trade ON trade.id = enter.trade_id
        WHERE trade.portfolio_id =? 
        GROUP By enter.trade_id
    `;
  const opened = await Query.doByValue(query, idPortfolio);
  return opened;
}

/**
 * selection de tous les trades  qui ont été  ouverts
 */
async function openedGlobal() {
  const query = `
        select enter.trade_id as tradeId, SUM(enter.quantity) as quantity, 
        SUM(price*quantity) as totalEnterK, SUM(fees+tax) as totalEnterTaxs, trade.position
        FROM enter
        JOIN trade ON trade.id = enter.trade_id
        GROUP By enter.trade_id
    `;
  const opened = await Query.find(query);
  return opened;
}

// trades ouverts par un user **********************************
async function openedByUser(userID) {
  const query = `
        select enter.trade_id as tradeId, SUM(enter.quantity) as quantity, 
        SUM(price*quantity) as totalEnterK, SUM(fees+tax) as totalEnterTaxs, trade.position
        FROM enter
        JOIN trade ON trade.id = enter.trade_id
        JOIN portfolio ON portfolio.id = trade.portfolio_id
        WHERE portfolio.user_id = ?
        GROUP By enter.trade_id
    `;
  return await Query.doByValue(query, userID);
}

/**
 * selection de tous les trades long fermés pour un portfolios
 * retour de l'id du trade, de la quantité exit et du prix de vente total
 */
const closed = async (idPortfolio) => {
  const query = `
        select closure.trade_id as tradeId, SUM(closure.quantity) as quantity, 
        SUM(fees+tax) as totalExitTaxs,
        SUM(price*quantity) as totalExitPrice
        FROM closure
        JOIN trade ON trade.id = closure.trade_id
        WHERE trade.portfolio_id =?  
        GROUP By closure.trade_id
    `;
  return await Query.doByValue(query, idPortfolio);
};

/**
 * selection de tous les trades long fermés
 * retour de l'id du trade, de la quantité exit et du prix de vente total
 */
const closedGlobal = async () => {
  const query = `
        select closure.trade_id as tradeId, SUM(closure.quantity) as quantity, 
        SUM(fees+tax) as totalExitTaxs,
        SUM(price*quantity) as totalExitPrice
        FROM closure
        JOIN trade ON trade.id = closure.trade_id  
        GROUP By closure.trade_id
    `;
  return await Query.find(query);
};

/**
 * selection de tous les trades long fermés par un user
 * retour de l'id du trade, de la quantité exit et du prix de vente total
 */
const closedByUser = async (userId) => {
  const query = `
        select closure.trade_id as tradeId, SUM(closure.quantity) as quantity, 
        SUM(fees+tax) as totalExitTaxs,
        SUM(price*quantity) as totalExitPrice
        FROM closure
        JOIN trade ON trade.id = closure.trade_id
        JOIN portfolio ON portfolio.id = trade.portfolio_id
        WHERE portfolio.user_id = ?
        GROUP By closure.trade_id
    `;
  return await Query.doByValue(query, userId);
};

/**
 * @param {*} idTrade
 * @returns Détails du trade actifs
 */
const detailsCurrentTrade = async (idTrade, prutmp) => {
  const query = `
        SELECT trade.currentTarget, trade.currentStop, 
        stock.title,
        activeStock.lastQuote, activeStock.beforeQuote
        FROM trade
        JOIN stock ON trade.stock_id = 	stock.id
        JOIN activeStock ON stock.id = activeStock.stock_id
        WHERE trade.id = ? 
    `;
  const result = await Query.doByValue(query, idTrade);
  if (result.length === 0) {
    result.push({
      currentTarget: prutmp,
      currentStop: prutmp,
      title: "Error loading",
      lastQuote: prutmp,
      beforeQuote: prutmp,
    });
  }
  return result;
};

/***********************************************************
 * retourne les trades à partir des tableaux
 * des entrées et de celui des sorties sur les long
 */
async function getDetails(opened, closed) {
  let activesTrades = [];
  let closedTrades = [];

  // on commence à construire un tableau avec tous les détails des trades
  for (const element1 of opened) {
    // pour chaque trade
    let remains = 0;
    let flag = false;
    for (const element2 of closed) {
      if (element2.tradeId === element1.tradeId) {
        flag = true;
        // on verifie si il existe une cloture

        remains = +element1.quantity - element2.quantity;
        if (remains > 0) {
          // le trade est actif
          activesTrades.push({
            tradeId: element1.tradeId,
            position: element1.position,
            bougth: element1.quantity,
            enterK: element1.totalEnterK,
            enterTaxs: element1.totalEnterTaxs,
            remains: remains,
            sold: element2.quantity,
            exitK: element2.totalExitPrice,
            exitTaxs: element2.totalExitTaxs,
          });
        } else {
          // le trade n'est plus actif
          closedTrades.push({
            tradeId: element1.tradeId,
            position: element1.position,
            bougth: element1.quantity,
            enterK: element1.totalEnterK,
            enterTaxs: element1.totalEnterTaxs,
            remains: remains,
            sold: element2.quantity,
            exitK: element2.totalExitPrice,
            exitTaxs: element2.totalExitTaxs,
          });
        }
      }
    }

    if (flag === false) {
      // pas de cloture pour ce trade
      activesTrades.push({
        tradeId: element1.tradeId,
        position: element1.position,
        bougth: element1.quantity,
        enterK: element1.totalEnterK,
        enterTaxs: element1.totalEnterTaxs,
        remains: +element1.quantity,
        sold: 0,
        exitK: 0,
        exitTaxs: 0,
      });
    }
  }

  // pour chaque trade ACTIF  -> infos actuelles sur target/objectif/ cours jour et précédent
  const activesDetails = [];
  for (const element of activesTrades) {
    // on passe le pru pour permettre de définir une valeur par defaut si
    // pas de titre dans la DataBase
    const prutmp = +((+element.enterK + +element.enterTaxs) / +element.bougth);

    const [details] = await detailsCurrentTrade(element.tradeId, prutmp);

    //console.log("detail of active", element.tradeId,"details",details);
    activesDetails.push({ ...element, ...details });
  }
  //console.log("actifs : ", activesDetails);
  // console.log("totalement cloturés  : ", closedTrades);
  return { activesDetails, closedTrades };
}

/************************************************************
 * @param {*} activesDetails
 * @returns la synthèse des trades actis
 */
function balanceOfActivestrades(activesDetails) {
  const balanceActives = {
    activeK: 0,
    currentPv: 0,
    potential: 0,
    perfIfStopeed: 0,
    dailyVariation: 0,
    assets: 0,
    cash: 0,
  };

  for (const element of activesDetails) {
    // on passe en revue chaque trade

    // console.log(element)

    const nbActivesShares = +element.bougth - +element.sold;
    const pru = +((+element.enterK + +element.enterTaxs) / +element.bougth); // pru si long ou garantie si short

    //console.log (pru)

    // capital investi sur chaque trade ( ce qui sort du wallet)
    const activeK = pru * nbActivesShares;
    balanceActives.activeK += activeK;

    // +/- value actuelle en montant / positions actives
    const pv =
      element.position === "long"
        ? nbActivesShares * (element.lastQuote - pru)
        : nbActivesShares *
          ((+element.enterK - +element.enterTaxs) / +element.bougth -
            +element.lastQuote);

    balanceActives.currentPv += pv;

    // potentiel restant en valeur / positions actives
    const remains =
      nbActivesShares *
      (element.position === "long"
        ? element.currentTarget - element.lastQuote
        : element.lastQuote - element.currentTarget);
    balanceActives.potential += remains;

    // performance si stop touché (risque ) en valeur / posirtions actives
    const perfIfStopped =
      element.position === "long"
        ? nbActivesShares * (+element.currentStop - pru)
        : nbActivesShares *
            (+element.enterK / +element.bougth - +element.currentStop) -
          +element.enterTaxs;
    balanceActives.perfIfStopeed += perfIfStopped;

    // daily variation = valorisation jour - valorisation veille en valeur
    const delta =
      element.position === "long"
        ? (element.lastQuote - element.beforeQuote) * nbActivesShares
        : -(element.lastQuote - element.beforeQuote) * nbActivesShares;
    balanceActives.dailyVariation += delta;

    // potentiel des titres actifs = ce qui rentre si je vends

    const assets =
      element.position === "long"
        ? +nbActivesShares * +element.lastQuote
        : +nbActivesShares *
          (+element.enterK / +element.bougth -
            +element.lastQuote +
            +element.enterK / +element.bougth);
    balanceActives.assets += assets;

    // mouvements de cash sur le porfolio
    const cash =
      -element.enterK - +element.enterTaxs + +element.exitK - +element.exitTaxs;
    balanceActives.cash += cash;
  }

  balanceActives.assets = balanceActives.assets.toFixed(2);

  return balanceActives;
}

/************************************************************
 * on construit le dashboard
 * @param {*} balanceActives
 * @param {*} closedTrades
 */
function feedDashboard(portfolioDash, balanceActives, closedTrades) {
  portfolioDash.currentPv = +balanceActives.currentPv.toFixed(2);
  portfolioDash.currentPvPc = (
    (balanceActives.currentPv / balanceActives.activeK) *
    100
  ).toFixed(2);

  portfolioDash.potential = balanceActives.potential.toFixed(2);
  portfolioDash.potentialPc = +(
    (balanceActives.potential / balanceActives.activeK) *
    100
  ).toFixed(2);

  portfolioDash.perfIfStopeed = +balanceActives.perfIfStopeed.toFixed(2);
  portfolioDash.perfIfStopeedPc = +(
    (balanceActives.perfIfStopeed / balanceActives.activeK) *
    100
  ).toFixed(2);

  portfolioDash.dailyVariation = +balanceActives.dailyVariation.toFixed(2);
  portfolioDash.dailyVariationPc = +(
    (balanceActives.dailyVariation / balanceActives.activeK) *
    100
  ).toFixed(2);

  portfolioDash.assets = balanceActives.assets;

  // pour la suite on intègre les  positions clôturées qui vont influer sur la cash du portfolio
  let closedTradesCash = 0;

  for (const element of closedTrades) {
    closedTradesCash += +element.bougth - +element.sold;
  }

  portfolioDash.cash = +(
    +portfolioDash.initCredit +
    closedTradesCash +
    balanceActives.cash
  ).toFixed(2);

  portfolioDash.totalBalance = +(
    +portfolioDash.assets + portfolioDash.cash
  ).toFixed(2);

  portfolioDash.totalPerf = +(
    +portfolioDash.totalBalance - portfolioDash.initCredit
  ).toFixed(2);

  portfolioDash.totalPerfPc = +(
    ((+portfolioDash.totalBalance - portfolioDash.initCredit) /
      +portfolioDash.initCredit) *
    100
  ).toFixed(2);

  return portfolioDash;
}

/***********************************************************
 * On recupère le tableau de bord d'un portfolio particulier  /portfolio/dashboard/id
 */

export const getOnePortfolioDashboard = async (req, res) => {
  try {
    const portfolioDash = {
      id: req.params.idPortfolio,
      currentPv: 0,
      currentPvPc: 0,
      potential: 0,
      potentialPc: 0,
      perfIfStopeed: 0,
      perfIfStopeedPc: 0,
      dailyVariation: 0,
      dailyVariationPc: 0,
      initCredit: 0,
      assets: 0,
      cash: 0,
      totalBalance: 0,
      totalPerf: 0,
      totalPerfPc: 0, 
      currencyId: 0, 
    };
    
    // set de la devise
    portfolioDash.currencyId = (await (portfolioInfos(portfolioDash.id))).currencyId;

    // initial credit
    portfolioDash.initCredit = +(await initial(portfolioDash.id));

    // on recupère tous les trades ouverts et fermés sur le portfolio
    const allOpensTrades = await opened(portfolioDash.id);
    const allClosedTrades = await closed(portfolioDash.id);

    // on va recupérer les détails des trades triés par encours et fermés
    const { activesDetails, closedTrades } = await getDetails(
      allOpensTrades,
      allClosedTrades
    );

    // on va chercher la synthèse des trades actifs
    const balanceActives = balanceOfActivestrades(activesDetails);

    // on traite les infos pour faire le dashboard
    const dashboard = await feedDashboard(
      portfolioDash,
      balanceActives,
      closedTrades
    );

    res.status(200).json(dashboard);
  } catch (error) {
    res.json({ msg: error });
  }
};

/**
 * DashBoard Global ***********  bilan de tout *************
 * route portfolio/dashboard/global
 */
// export const getGlobalDashboard = async (req, res) => {
//   try {
//     const portfolioDash = {
//       currentPv: 0,
//       currentPvPc: 0,
//       potential: 0,
//       potentialPc: 0,
//       perfIfStopeed: 0,
//       perfIfStopeedPc: 0,
//       dailyVariation: 0,
//       dailyVariationPc: 0,
//       initCredit: 0,
//       assets: 0,
//       cash: 0,
//       totalBalance: 0,
//       totalPerf: 0,
//       totalPerfPc: 0,
//     };

//     // initial credit
//     portfolioDash.initCredit = +(await initialGlobal());

//     // on recupère tous les trades ouverts et fermés
//     const allOpensTrades = await openedGlobal();
//     const allClosedTrades = await closedGlobal();

//     // on va recupérer les détails des trades triés par encours et fermés
//     const { activesDetails, closedTrades } = await getDetails(
//       allOpensTrades,
//       allClosedTrades
//     );

//     // on va chercher la synthèse des trades actifs
//     const balanceActives = balanceOfActivestrades(activesDetails);

//     // on traite les infos pour faire le dashboard
//     const dashboard = await feedDashboard(
//       portfolioDash,
//       balanceActives,
//       closedTrades
//     );

//     res.status(200).json(dashboard);
//   } catch (error) {
//     res.json({ msg: error });
//   }
// };

/***********************************************************
 *  {Dashbors Globall d'un user}
 *
 */
export const getGlobalDashboardOfOneUser = async (req, res) => {

  // currency de l'application 
  const appCurrency = +process.env.APP_CURRENCY_ID;

  try {
    const portfolioDash = {
      userId: req.params.userId,
      currentPv: 0,
      currentPvPc: 0,
      potential: 0,
      potentialPc: 0,
      perfIfStopeed: 0,
      perfIfStopeedPc: 0,
      dailyVariation: 0,
      dailyVariationPc: 0,
      initCredit: 0,
      assets: 0,
      cash: 0,
      totalBalance: 0,
      totalPerf: 0,
      totalPerfPc: 0,
    };

    // initial credit
    portfolioDash.initCredit = +(await initialByUser(portfolioDash.userId));

    // // on recupère tous les trades ouverts et fermés pour un user
    const allOpensTradesByUser = await openedByUser(portfolioDash.userId);
    const allClosedTradesByUser = await closedByUser(portfolioDash.userId);

    // on va recupérer les détails des trades triés par encours et fermés
    const { activesDetails, closedTrades } = await getDetails(
      allOpensTradesByUser,
      allClosedTradesByUser
    );

    //console.log(activesDetails, closedTrades);

    // on va chercher la synthèse des trades actifs
    const balanceActives = balanceOfActivestrades(activesDetails);

    //console.log (balanceActives);

    // on traite les infos pour faire le dashboard
    const dashboard = await feedDashboard(
      portfolioDash,
      balanceActives,
      closedTrades
    );

    res.status(200).json(dashboard);
  } catch (error) {
    res.json({ msg: error });
  }
};

/***********************************************************
 * On recupère le tableau de bord d'un portfolio particulier  /portfolio/dashboard/id
 */

export const getDetailsOfOnePorfolio = async (req, res) => {
  try {
    const portfolioId = req.params.idPortfolio;

    // on recupère tous les trades ouverts et fermés sur le portfolio
    const allOpensTrades = await opened(portfolioId);
    const allClosedTrades = await closed(portfolioId);

    // on va recupérer les détails des trades triés par en-cours et fermés
    const { activesDetails, closedTrades } = await getDetails(
      allOpensTrades,
      allClosedTrades
    );

    //console.log(activesDetails);

    ///////////////////////////////////
    // pour chaque trade actif on va construire le tableaux des détails

    const detailledTrades = [];

    for (const element of activesDetails) {
      const trade = {
        tradeId: element.tradeId,
        title: element.title,
        last: +(+element.lastQuote).toFixed(2),
        position: element.position,
        pru: 0,
        currentPv: 0,
        currentPvPc: 0,
        potential: 0,
        potentialPc: 0,
        perfIfStopeed: 0,
        perfIfStopeedPc: 0,
        dailyVariation: 0,
        dailyVariationPc: 0,
        target: +(+element.currentTarget).toFixed(2),
        stop: +(+element.currentStop).toFixed(2),
        initialValue: 0,
        actualValue: 0,
        nbActivesShares: 0,
      };

      ///////// calculs
      const nbActivesShares = +element.bougth - element.sold;
      const pru = +((+element.enterK + +element.enterTaxs) / +element.bougth);
      const activeK = pru * nbActivesShares;

      trade.pru = pru;
      trade.nbActivesShares = nbActivesShares;

      // +/- value actuelle en montant / positions actives
      trade.currentPv = +(
        element.position === "long"
          ? nbActivesShares * (element.lastQuote - pru)
          : nbActivesShares *
            ((+element.enterK - +element.enterTaxs) / +element.bougth -
              +element.lastQuote)
      ).toFixed(2);
      trade.currentPvPc = +((trade.currentPv / activeK) * 100).toFixed(2);

      // potentiel restant en valeur / positions actives
      trade.potential = +(
        nbActivesShares *
        (element.position === "long"
          ? element.currentTarget - element.lastQuote
          : element.lastQuote - element.currentTarget)
      ).toFixed(2);
      trade.potentialPc = +((trade.potential / activeK) * 100).toFixed(2);

      // performance si stop touché (risque ) en valeur / posirtions actives
      trade.perfIfStopeed = +(
        element.position === "long"
          ? nbActivesShares * (+element.currentStop - pru)
          : nbActivesShares *
              (+element.enterK / +element.bougth - +element.currentStop) -
            +element.enterTaxs
      ).toFixed(2);
      trade.perfIfStopeedPc = +((trade.perfIfStopeed / activeK) * 100).toFixed(
        2
      );

      // daily variation = valorisation jour - valorisation veille en valeur
      trade.dailyVariation = +(
        element.position === "long"
          ? (element.lastQuote - element.beforeQuote) * nbActivesShares
          : -(element.lastQuote - element.beforeQuote) * nbActivesShares
      ).toFixed(2);
      trade.dailyVariationPc = +(
        (trade.dailyVariation / activeK) *
        100
      ).toFixed(2);

      trade.initialValue = +activeK.toFixed(2);

      // exposition :
      trade.actualValue = +(
        element.position === "long"
          ? +nbActivesShares * +element.lastQuote
          : +nbActivesShares *
            (+element.enterK / +element.bougth -
              +element.lastQuote +
              +element.enterK / +element.bougth)
      ).toFixed(2);

      detailledTrades.push(trade);
    }

    res.status(200).json(detailledTrades);
  } catch (error) {
    res.json({ msg: error });
  }
};