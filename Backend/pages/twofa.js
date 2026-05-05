"use strict";

/**
 * 2FA Page Guard
 * Enforces pending2faUser session; rendering handled by pages.json -> Authentication/TwoFA.ejs
 */

module.exports.load = async function (app, db) {

    app.get("/2fa", async (req, res, next) => {
        if (!req.session.pending2faUser) {
            return res.redirect("/login");
        }
        next();
    });

};
