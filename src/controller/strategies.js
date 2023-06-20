import Query from "../model/query.js";

export const getStrategiesByUser = async (req, res) => {
  const { userId } = req.params;
  try {
    const query = `SELECT id, title FROM strategy
        WHERE strategy.user_id= ?`;
    const portfolios = await Query.doByValue(query, userId);
    res.status(200).json(portfolios);
  } catch (error) {
    res.json({ msg: error });
  }
};
