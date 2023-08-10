import Query from "../model/query.js";
import { appCurrencies, appGetForex } from "../controller/currency.js";
import { feedPortfolio } from "./deposit.js";

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
    feedPortfolio(idPort, deposit);
    res.status(200).json({ msg: "portefeuille créé" });
  } catch (error) {
    res.json({ msg: error });
  }
};

/**
 *  faire un depot/ retrait sur un portefeuille
 */
export const deposit = async (req, res) => {
  try {
    const { portfolioId, action, amount } = req.body;

    const ToInset = action === 2 ? -amount : amount;
    feedPortfolio(portfolioId, ToInset);
    res.status(200).json({ msg: "versement OK" });
  } catch (error) {
    res.json({ msg: error });
  }
};

//**********************************************************
//* liste des portfolios pour un user (userId)
//*
async function portfoliosByUser(userId) {
  const query = `SELECT portfolio.id, portfolio.title, portfolio.comment, 
      currency.id as currencyId, currency.title as currency, currency.symbol as symbol, currency.abbr as abbr
      FROM portfolio
      JOIN currency on portfolio.currency_id = currency.id
      WHERE user_id = ?`;
  const portfolios = await Query.doByValue(query, userId);
  return portfolios;
}

//**********************************************************
//* rendre inactif un portefeuille
//*
export const idlePortfolio = async (req, res) => {
  const { idPortfolio } = req.params;
  try {
    const query = ` UPDATE portfolio SET status='idle' WHERE id =? `;
    await Query.doByValue(query, idPortfolio);
    res.status(200).json({ msg: "idle OK" });

  } catch (error) {
    res.json({ msg: error });
  }
};

/**
 * retourne les portfolios,  route /portfolio/user/:userId
 */
export const getPortfoliosByUser = async (req, res) => {
  const { userId } = req.params;
  try {
    const portfolios = await portfoliosByUser(userId);
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
};

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
// const initialByUser = async (id) => {
//   const query = `
//     SELECT SUM(deposit.amount) as totalDeposit FROM deposit
//     JOIN portfolio ON deposit.porfolio_id = portfolio.id
//     WHERE  portfolio.user_id = ?
//     `;
//   const result = await Query.doByValue(query, id);
//   return result[0].totalDeposit;
// };

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
 * des entrées et de celui des sorties
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
            bougth: +element1.quantity,
            enterK: +element1.totalEnterK,
            enterTaxs: +element1.totalEnterTaxs,
            remains: +remains,
            sold: +element2.quantity,
            exitK: +element2.totalExitPrice,
            exitTaxs: +element2.totalExitTaxs,
          });
        } else {
          // le trade n'est plus actif
          closedTrades.push({
            tradeId: element1.tradeId,
            position: element1.position,
            bougth: +element1.quantity,
            enterK: +element1.totalEnterK,
            enterTaxs: +element1.totalEnterTaxs,
            remains: +remains,
            sold: +element2.quantity,
            exitK: +element2.totalExitPrice,
            exitTaxs: +element2.totalExitTaxs,
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
  //  console.log("totalement cloturés  : ", closedTrades);
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
    balanceActives.assets += +assets;

    // mouvements de cash sur le porfolio (ce qu'a rapporté les vendus)
    balanceActives.cash +=
      -element.enterK - +element.enterTaxs + +element.exitK - +element.exitTaxs;
  }

  balanceActives.assets = +balanceActives.assets.toFixed(2);

  return balanceActives;
}

/************************************************************
 * on construit le dashboard
 * @param {*} balanceActives
 * @param {*} closedTrades
 */
function feedDashboard(portfolioDash, balanceActives, closedTrades) {
  portfolioDash.currentPv = +balanceActives.currentPv.toFixed(2);
  portfolioDash.activeK = +balanceActives.activeK.toFixed(2);
  portfolioDash.currentPvPc =
    balanceActives.activeK !== 0
      ? +((balanceActives.currentPv / balanceActives.activeK) * 100).toFixed(2)
      : 0;

  portfolioDash.potential = +balanceActives.potential.toFixed(2);
  portfolioDash.potentialPc =
    balanceActives.activeK !== 0
      ? +((balanceActives.potential / balanceActives.activeK) * 100).toFixed(2)
      : 0;

  portfolioDash.perfIfStopeed = +balanceActives.perfIfStopeed.toFixed(2);
  portfolioDash.perfIfStopeedPc =
    balanceActives.activeK !== 0
      ? +(
          (balanceActives.perfIfStopeed / balanceActives.activeK) *
          100
        ).toFixed(2)
      : 0;

  portfolioDash.dailyVariation = +balanceActives.dailyVariation.toFixed(2);
  portfolioDash.dailyVariationPc =
    balanceActives.activeK !== 0
      ? +(
          (balanceActives.dailyVariation / balanceActives.activeK) *
          100
        ).toFixed(2)
      : 0;

  portfolioDash.assets = +balanceActives.assets;

  // pour la suite on intègre les  positions clôturées qui vont influer sur la cash du portfolio
  let closedTradesCash = 0;

  for (const element of closedTrades) {
    closedTradesCash +=
      -element.enterK - +element.enterTaxs + +element.exitK - +element.exitTaxs;
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

  portfolioDash.totalPerfPc =
    portfolioDash.initCredit !== 0
      ? +(
          ((+portfolioDash.totalBalance - portfolioDash.initCredit) /
            +portfolioDash.initCredit) *
          100
        ).toFixed(2)
      : 0;

  return portfolioDash;
}

/***********************************************************
 * On recupère le tableau de bord d'un portfolio particulier (portfolioId)
 */
async function portfolioDashboard(portfolioId) {
  const portfolioDash = {
    id: portfolioId,
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
  portfolioDash.currencyId = (
    await portfolioInfos(portfolioDash.id)
  ).currencyId;

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
  return dashboard;
}

/**
 * dashboard d'un portfolio par la route  /portfolio/dashboard/id
 */
export const getOnePortfolioDashboard = async (req, res) => {
  try {
    const dashboard = await portfolioDashboard(+req.params.idPortfolio);
    res.status(200).json(dashboard);
  } catch (error) {
    res.json({ msg: error });
  }
};

/***********************************************************
 *  {Dashbors Globall d'un user}
 *
 */

export const getGlobalDashboardOfOneUser = async (req, res) => {
  // on recupère les differentes currencies de l'app
  const currenciesArray = await appCurrencies();
  // on récupère l'abbr de l'appCurrency (devise de base de l'app.)
  const appCurrencyAbbr = currenciesArray.find(
    (el) => el.id === +process.env.APP_CURRENCY_ID
  ).abbr;
  // on récupère le symbol de l'appCurrency (devise de base de l'app.)
  const appCurrencySymbol = currenciesArray.find(
    (el) => el.id === +process.env.APP_CURRENCY_ID
  ).symbol;
  // on récupère les infos sur les devises et les taux de conversions
  const appForex = await appGetForex();

  try {
    const portfolioDash = {
      userId: +req.params.userId,
      currencyId: +process.env.APP_CURRENCY_ID,
      currencyAbbr: appCurrencyAbbr,
      currencySymbol: appCurrencySymbol,
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
      activeK: 0,
    };
    // on recupère la liste des portfolios de l'user
    const portfolios = await portfoliosByUser(portfolioDash.userId);

    // pour chaque portfolio on va chercher le dashboard et alimenter le dashboard global

    for await (const portfolio of portfolios) {
      const dash = await portfolioDashboard(portfolio.id);
      //console.log(dash);

      // on récupère l'abbr du dashboardCurrency
      const dashboardCurrencyAbbr = currenciesArray.find(
        (el) => el.id === +dash.currencyId
      ).abbr;

      // a partir de la currency de l'app et de celle du portfilio on va chercher le taux de change
      const xRate = appForex.find(
        (el) =>
          el.from_currency === appCurrencyAbbr &&
          el.to_currency === dashboardCurrencyAbbr
      ).rate;

      // console.log(
      //   "portif n°:",
      //   dash.id,
      //   "devise portif:",
      //   dashboardCurrencyAbbr,
      //   "taux de conversion",
      //   xRate
      // );

      portfolioDash.currentPv = +(
        portfolioDash.currentPv +
        (1 / xRate) * dash.currentPv
      ).toFixed(2);
      portfolioDash.potential = +(
        portfolioDash.potential +
        (1 / xRate) * dash.potential
      ).toFixed(2);
      portfolioDash.perfIfStopeed = +(
        portfolioDash.perfIfStopeed +
        (1 / xRate) * dash.perfIfStopeed
      ).toFixed(2);
      portfolioDash.dailyVariation = +(
        portfolioDash.dailyVariation +
        (1 / xRate) * dash.dailyVariation
      ).toFixed(2);
      portfolioDash.initCredit = +(
        portfolioDash.initCredit +
        (1 / xRate) * dash.initCredit
      ).toFixed(2);
      portfolioDash.assets = +(
        portfolioDash.assets +
        (1 / xRate) * dash.assets
      ).toFixed(2);
      portfolioDash.cash = +(
        portfolioDash.cash +
        (1 / xRate) * dash.cash
      ).toFixed(2);
      portfolioDash.totalBalance = +(
        portfolioDash.totalBalance +
        (1 / xRate) * dash.totalBalance
      ).toFixed(2);
      portfolioDash.totalPerf = +(
        portfolioDash.totalPerf +
        (1 / xRate) * dash.totalPerf
      ).toFixed(2);
      portfolioDash.activeK = +(
        portfolioDash.activeK +
        (1 / xRate) * dash.activeK
      ).toFixed(2);
      //console.log(portfolioDash);
    }

    // calcul de la vartiation jour
    portfolioDash.dailyVariationPc = +(
      (portfolioDash.dailyVariation /
        (portfolioDash.currentPv - portfolioDash.dailyVariation)) *
      100
    ).toFixed(2);

    // calcul de % pv latente / k engagé
    portfolioDash.currentPvPc = +(
      (portfolioDash.currentPv / portfolioDash.activeK) *
      100
    ).toFixed(2);

    // calcul du potentiel des potisions ouvertes
    portfolioDash.potentialPc = +(
      (portfolioDash.potential / portfolioDash.activeK) *
      100
    ).toFixed(2);

    // calcul du risk potentiel
    portfolioDash.perfIfStopeedPc = +(
      (portfolioDash.perfIfStopeed / portfolioDash.activeK) *
      100
    ).toFixed(2);

    // calcul perf totale
    portfolioDash.totalPerfPc = +(
      (portfolioDash.totalPerf / portfolioDash.initCredit) *
      100
    ).toFixed(2);

    res.status(200).json(portfolioDash);
  } catch (error) {
    res.json({ msg: error });
  }
};

/***********************************************************
 * On recupère le detail d'un portfolio particulier  /portfolio/dashboard/id
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
