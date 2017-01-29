var bodyParser = require('body-parser');
var cors = require('cors');
var Promise = require("bluebird");
var express = require('express');
var moment = require('moment');
var request = require('request');
var server = express();
server.use(cors());
server.use(bodyParser.json());
// create application/x-www-form-urlencoded parser
bodyParser.urlencoded({ extended: true });
if (process.env.debug) {
    process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
    request = request.defaults({ "proxy": 'http://127.0.0.1:8888' });
}
else {
    server.use(express.static(__dirname));
}
var server_port = process.env.PORT || 3001;
var login = function (user, password) {
    return new Promise(function (resolve, reject) {
        request.post({
            url: "https://www.hydroquebec.com/portail/web/clientele/authentification?p_auth=EbW90P8A&p_p_id=58&p_p_lifecycle=1&p_p_state=maximized&_58_struts_action=/login/login&_58_action=login",
            body: "login=" + user + "&_58_password=" + password,
            // mode: "no-cors",
            headers: {
                'Content-Type': "application/x-www-form-urlencoded"
            },
        }, function (error, response, body) {
            if (error) {
                reject(response);
                return;
            }
            var cookieString = "";
            var cookieArray = response.headers['set-cookie'];
            cookieArray.forEach(function (cookie) {
                cookie = cookie.split(";").filter(function (x) { return x.indexOf("JSESSIONID") !== -1; }).toString();
                if (cookie && cookieString.indexOf(cookie) === -1) {
                    cookieString += cookie + ";";
                }
            });
            request.get({
                url: "https://www.hydroquebec.com/portail/fr/group/clientele/portrait-de-consommation",
                method: "GET",
                headers: {
                    'Cookie': cookieString
                }
            }, function (error, response, body) {
                if (error) {
                    reject(response);
                    return;
                }
                resolve(cookieString);
            });
        });
    });
};
var getSummaryData = function (cookie) {
    return new Promise(function (resolve, reject) {
        request.get({
            url: "https://www.hydroquebec.com/portail/fr/group/clientele/portrait-de-consommation?p_p_id=portraitConsommation_WAR_lswrb_INSTANCE_G4WcPdIy6LKl&p_p_lifecycle=2&p_p_resource_id=resourceObtenirDonneesPeriodesConsommation",
            method: "GET",
            headers: {
                'Cookie': cookie
            }
        }, function (error, response, body) {
            if (!error) {
                resolve(body);
                return;
            }
            else {
                reject(response);
                return;
            }
        });
    });
};
var getDetailsData = function (cookie, start, end) {
    return new Promise(function (resolve, reject) {
        request.get({
            url: "https://www.hydroquebec.com/portail/fr/group/clientele/portrait-de-consommation?p_p_id=portraitConsommation_WAR_lswrb_INSTANCE_G4WcPdIy6LKl&p_p_lifecycle=2&p_p_resource_id=resourceObtenirDonneesQuotidiennesConsommation&dateDebutPeriode=" + moment(start).format("YYYY-MM-DD") + "&dateFinPeriode=" + moment(end).format("YYYY-MM-DD"),
            method: "GET",
            headers: {
                'Cookie': cookie
            }
        }, function (error, response, body) {
            if (!error) {
                resolve(body);
                return;
            }
            else {
                reject(response);
                return;
            }
        });
    });
};
server.post('/login', function (req, res) {
    var body = req.body;
    login(body.user, body.password)
        .then(function (cookie) {
        if (cookie) {
            res.sendStatus(200);
        }
        else {
            res.sendStatus(401);
        }
    });
});
server.post('/data/summary', function (req, res) {
    var body = req.body;
    login(body.user, body.password)
        .then(function (cookie) {
        getSummaryData(cookie).then(function (val) {
            res.contentType("application/json");
            res.send(val);
        });
    });
});
server.post('/data/details', function (req, res) {
    var body = req.body;
    login(body.user, body.password)
        .then(function (cookie) {
        getDetailsData(cookie, body.start, body.end).then(function (val) {
            res.contentType("application/json");
            res.send(val);
        });
    });
});
server.get("/", function (req, res) {
    res.send('What are you here for?');
});
server.listen(server_port, function () {
    console.log("Listening on port " + server_port);
});
//# sourceMappingURL=server.js.map