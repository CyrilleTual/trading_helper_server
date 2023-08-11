 /**
 * Liste des trades actifs pour un utilisateur spécifié.
 * 
 * Cette fonction récupère la liste des trades actifs pour un utilisateur donné en effectuant les étapes suivantes :
 * - Exécution de requêtes SQL pour obtenir la somme des quantités ouvertes et fermées pour chaque trade associé à l'utilisateur.
 * - Appel de la fonction 'activesOnly' pour filtrer et obtenir les trades actifs avec les quantités restantes.
 * - Pour chaque trade actif, récupération de ses détails et calcul de certaines valeurs comme le PRU et la performance.
 * - Préparation des informations formatées à renvoyer dans la réponse.
 * - Renvoi de la liste des trades actifs avec leurs détails en réponse.
 * 
 * @param {*} req - L'objet de la requête HTTP.
 * @param {*} res - L'objet de la réponse HTTP.
 */
export const getByUser = async (req, res) => {
  const { userId } = req.params;
  let tradesActifs = []; // Tableau à retourner contenant les trades actifs

  try {
    // Requêtes pour obtenir la somme des quantités ouvertes et fermées pour chaque trade associé à l'utilisateur
    const queryOpened = `
      SELECT enter.trade_id AS tradeId, SUM(enter.quantity) AS opened
      FROM enter
      JOIN trade ON enter.trade_id = trade.id
      JOIN portfolio ON trade.portfolio_id = portfolio.id
      JOIN user ON portfolio.user_id = user.id
      WHERE user.id = ?
      GROUP BY enter.trade_id
    `;

    const queryClosed = `
      SELECT closure.trade_id AS tradeId, SUM(closure.quantity) AS closed
      FROM closure
      JOIN trade ON closure.trade_id = trade.id
      JOIN portfolio ON trade.portfolio_id = portfolio.id
      JOIN user ON portfolio.user_id = user.id
      WHERE user.id = ?
      GROUP BY closure.trade_id
    `;

    // Exécution des requêtes pour obtenir les données des trades ouverts et fermés
    const opened = await Query.doByValue(queryOpened, [userId]);
    const closed = await Query.doByValue(queryClosed, [userId]);

    // Filtrage des trades actifs en appelant la fonction 'activesOnly'
    let listeTradesActifs = activesOnly(opened, closed);

    // Pour chaque trade actif, récupération de ses détails et calcul de certaines valeurs
    for (const tradeItem of listeTradesActifs) {
      // Requête pour obtenir les détails du trade et des stocks associés
      const queryDetails = `
        SELECT DISTINCT stock.title, stock.id AS stockId, stock.isin AS isin, stock.place AS place, stock.ticker AS ticker, 
        activeStock.lastQuote,
        trade.firstEnter, currentTarget, currentStop, trade.comment,
        portfolio.id AS portfolioId 
        FROM enter
        JOIN trade ON enter.trade_id = trade.id 
        JOIN stock ON trade.stock_id = stock.id 
        JOIN activeStock ON activeStock.stock_id = stock.id
        JOIN portfolio ON trade.portfolio_id = portfolio.id 
        JOIN user ON portfolio.user_id = user.id 
        WHERE trade.id = ?
      `;
      const [tradeDetails] = await Query.doByValue(queryDetails, tradeItem.idTrade);

      // Calcul du PRU en récupérant les données nécessaires
      const queryPru = `
        SELECT SUM(price) + SUM(fees) + SUM(tax) / SUM(quantity) AS pru
        FROM enter
        WHERE trade_id = ?
      `;
      const [{ pru }] = await Query.doByValue(queryPru, [tradeItem.idTrade]);

      // Préparation des informations formatées à renvoyer
      let tradeActif = {
        title: tradeDetails.title,
        isin: tradeDetails.isin,
        place: tradeDetails.place,
        ticker: tradeDetails.ticker,
        lastQuote: tradeDetails.lastQuote,
        quantity: tradeItem.remains,
        pru: Number.parseFloat(pru).toFixed(3),
        perf: `${Number.parseFloat((tradeDetails.lastQuote - pru) / pru).toFixed(2)} %`,
        firstEnter: new Date(tradeDetails.firstEnter).toLocaleDateString("fr-FR"),
        currentTarget: tradeDetails.currentTarget,
        currentStop: tradeDetails.currentStop,
        comment: tradeDetails.comment,
      };

      // Ajout des informations du trade actif au tableau à renvoyer
      tradesActifs.push(tradeActif);
    }

    // Renvoi de la liste des trades actifs avec leurs détails en réponse
    res.status(200).json(tradesActifs);
  } catch (error) {
    // En cas d'erreur, renvoi d'un message d'erreur dans la réponse JSON
    res.status(500).json({ msg: "Erreur lors de la récupération des trades actifs", error });
  }
};
