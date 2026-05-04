const settings = require("../../settings.json");
const fs = require('fs');

const indexjs = require("../../index.js");
const stripe = require('stripe')(settings.stripe.key);

module.exports.load = async function (app, db) {
  app.post("/buycoins", async (req, res) => {
    if (!req.session.pterodactyl) return res.redirect("/?error=" + encodeURIComponent((Buffer.from("You are not logged in.").toString('base64'))));

    const { number, month, year, vrf, amt } = req.body;

    if (!number || !month || !year || !vrf || !amt) {
      return res.redirect("/buy?error=" + encodeURIComponent((Buffer.from("Missing card information.").toString('base64'))));
    }

    const token = await stripe.tokens.create({
      card: {
        number: number,
        exp_month: +month,
        exp_year: +year,
        cvc: vrf,
      },
    });
    const charge = await stripe.charges.create({
      amount: amt * settings.stripe.amount,
      currency: 'EUR',
      source: token,
      description: 'Transaction: ' + settings.stripe.coins * amt,
    });
    if (charge.status != "succeeded") return res.redirect("/buy?error=" + encodeURIComponent((Buffer.from("Invalid card information.").toString('base64'))));
    let ccoins = await db.get(`coins-${req.session.userinfo.id}`)
    ccoins += settings.stripe.coins * amt;
    await db.set(`coins-${req.session.userinfo.id}`, ccoins)
    res.redirect("/buy?success=true");
  });
};