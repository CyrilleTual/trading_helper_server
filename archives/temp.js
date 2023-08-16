const logByRemenber = async (req, res) => {
  try {
    // Récupère le token depuis l'en-tête de la requête
    const TOKEN = req.headers["x-access-token"];

    // Vérifie si le token est présent et non nul
    if (!TOKEN || TOKEN === "null") {
      res.status(404).json({ msg: "Token not found" });
      return;
    } else {
      // Vérifie la validité du token en utilisant la clé secrète
      jwt.verify(TOKEN, TOKEN_SECRET, async (err, decoded) => {
        if (err) {
          res.status(401).json({ status: 401, msg: "Invalid token" });
          return;
        } else {
          // Vérifie la conformité du contenu du token avec les informations de la base de données
          // et récupère les informations nécessaires pour le store front

          const user = await checkinfos(decoded);

          if (user.length !== 0) {
            // Utilisateur trouvé

            const [{ id, email, alias, role }] = user;

            // Affiche les informations de l'utilisateur dans la console
            console.log(id, email, alias, role);

            // Envoie la réponse avec les informations de l'utilisateur
            res.status(200).json({
              msg: "Connexion automatique réussie",
              id,
              email,
              alias,
              role,
            });
          }
        }
      });
    }
  } catch (error) {
    res.status(401).json({ msg: "Problème d'identifiant" });
  }
};
