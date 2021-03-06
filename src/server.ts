import bodyParser = require('body-parser')
import cors = require('cors')

import Promise = require("bluebird");
import express = require('express')

import moment = require('moment')
var request = require('request');

var server = express();
server.use(cors());
server.use(bodyParser.json());

// create application/x-www-form-urlencoded parser
bodyParser.urlencoded({ extended: true });

if (process.env.debug) {
    process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
    request = request.defaults({ "proxy": 'http://127.0.0.1:8888' }) as any;
}
else {
    server.use(express.static(__dirname));
}
const server_port = process.env.PORT as number || 3001;

const login = (user: string, password: string) => {
    return new Promise<string>((resolve, reject) => {
        request.post(
            {
                url: `https://www.hydroquebec.com/portail/web/clientele/authentification?p_auth=EbW90P8A&p_p_id=58&p_p_lifecycle=1&p_p_state=maximized&_58_struts_action=/login/login&_58_action=login`,
                body: `login=${user}&_58_password=${password}`,
                // mode: "no-cors",
                headers: {
                    'Content-Type': "application/x-www-form-urlencoded"
                },
            }, (error, response, body) => {
                if (error) {
                    reject(response);
                    return;
                }

                else if (parseInt(response.statusCode) !== 302) {                    
                    reject(response);
                    return;
                }

                let cookieString = "";
                const cookieArray: string[] = response.headers['set-cookie'];
                cookieArray.forEach(cookie => {
                    cookie = cookie.split(";").filter(x => x.indexOf("JSESSIONID") !== -1).toString();
                    if (cookie && cookieString.indexOf(cookie) === -1) {
                        cookieString += cookie + ";"
                    }
                });

                request.get({
                    url: `https://www.hydroquebec.com/portail/fr/group/clientele/portrait-de-consommation`,
                    method: "GET",
                    headers: {
                        'Cookie': cookieString
                    }
                }, (error, response, body) => {
                    if (error) {
                        reject(response);
                        return;
                    }
                    resolve(cookieString);
                });
            });
    });
}

const getSummaryData = (cookie: string) => {
    return new Promise((resolve, reject) => {
        request.get({
            url: `https://www.hydroquebec.com/portail/fr/group/clientele/portrait-de-consommation?p_p_id=portraitConsommation_WAR_lswrb_INSTANCE_G4WcPdIy6LKl&p_p_lifecycle=2&p_p_resource_id=resourceObtenirDonneesPeriodesConsommation`,
            method: "GET",
            headers: {
                'Cookie': cookie
            }
        }, (error, response, body) => {
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
}

const getDetailsData = (cookie: string, start: Date, end: Date) => {
    return new Promise((resolve, reject) => {
        request.get({
            url: `https://www.hydroquebec.com/portail/fr/group/clientele/portrait-de-consommation?p_p_id=portraitConsommation_WAR_lswrb_INSTANCE_G4WcPdIy6LKl&p_p_lifecycle=2&p_p_resource_id=resourceObtenirDonneesQuotidiennesConsommation&dateDebutPeriode=${moment(start).format("YYYY-MM-DD")}&dateFinPeriode=${moment(end).format("YYYY-MM-DD")}`,
            method: "GET",
            headers: {
                'Cookie': cookie
            }
        }, (error, response, body) => {
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
}

server.post('/login', (req, res) => {
    const body = req.body;
    login(body.user, body.password)
        .then(cookie => {
            if (cookie) {
                res.sendStatus(200);
            }            
        })
        .catch(error => {
            res.sendStatus(401);
            res.send(error);
        });
});


server.post('/data/summary', (req, res) => {
    const body = req.body;

    login(body.user, body.password)
        .then(cookie => {
            getSummaryData(cookie).then(val => {
                res.contentType("application/json");
                res.send(val);
            });
        });
});

server.post('/data/details', (req, res) => {
    const body = req.body;

    login(body.user, body.password)
        .then(cookie => {
            getDetailsData(cookie, body.start, body.end).then(val => {
                res.contentType("application/json");
                res.send(val);
            });
        });
});

server.get("/", (req, res) => {
    res.send('What are you here for?');
});

server.listen(server_port, function () {
    console.log("Listening on port " + server_port)
});