import Query from "../model/query.js";

// recherche la différence actualisation sauf we

export async function checkIfUpdNeeded(req, res) {
  // recherche la  date actualisation des trades
  const query = `
    SELECT updDate
    FROM activeStock
    `;
  const upd = await Query.find(query);


   

  const lastUpd = new Date(upd[0].updDate);

  console.log ((new Date()-lastUpd).getMinutes())


  res.status(200).json(lastUpd);
}
