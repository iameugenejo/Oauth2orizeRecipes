var assert = require("assert")
    , app = require("../app.js")
    , request = require('request')
    , helper = require('./common').request
    , validate = require('./common').validate
    , properties = require('./common').properties


//Enable cookies so that we can perform logging in correctly to the OAuth server
//and turn off the strict SSL requirement
var request = request.defaults({jar: true, strictSSL: false});

/**
 * Tests for the Grant Type of Authorization Code.
 * This follows the testing guide roughly from
 * https://github.com/FrankHassanabad/Oauth2orizeRecipes/wiki/OAuth2orize-Authorization-Server-Tests
 */
describe('Grant Type Authorization Code', function () {
    //set the time out to be 20 seconds
    this.timeout(20000);
    describe('', function () {
        it('should redirect when trying to get authorization without logging in', function (done) {
            request.get('https://localhost:3000/logout');
            helper.getAuthorization({},
                function(error, response, body) {
                    assert.equal(-1, response.req.path.indexOf("/?code="));
                    done();
                }
            )
        });
        it('should work with the authorization_code asking for a refresh token', function (done) {
            //Log into the OAuth2 server as bob
            helper.login(
                function (error, response, body) {
                    //Get the OAuth2 authorization code
                    helper.getAuthorization({scope: 'offline_access'},
                        function (error, response, body) {
                            //Assert that we have the ?code in our URL
                            assert.equal(0, response.req.path.indexOf("/?code="));
                            var code = response.req.path.slice(7, response.req.path.length);
                            //Get the token
                            helper.postOAuthCode(code,
                                function (error, response, body) {
                                    validate.validateAccessRefreshToken(response.headers, body);
                                    var tokens = JSON.parse(body);
                                    //Get the user info
                                    helper.getUserInfo(tokens.access_token,
                                        function(error, response, body) {
                                            validate.validateUserJson(response.headers, body);
                                        }
                                    );
                                    //Get another valid access token from the refresh token
                                    helper.postRefeshToken(tokens.refresh_token, function(error, response, body) {
                                        validate.validateAccessToken(response.headers, body);
                                    });
                                    //Get another valid access token from the refresh token
                                    helper.postRefeshToken(tokens.refresh_token, function(error, response, body) {
                                        validate.validateAccessToken(response.headers, body);
                                    });
                                }
                            );
                            //Try to get the token again but we shouldn't be able to reuse the same code
                            helper.postOAuthCode(code,
                                function (error, response, body) {
                                    assert.equal(response.statusCode, 400);
                                    validate.validateInvalidCodeError(response.headers, body);
                                    done();
                                }
                            );
                        }
                    );
                }
            );
        });
        it('should work with the authorization_code not asking for a refresh token', function (done) {
            //Log into the OAuth2 server as bob
            helper.login(
                function (error, response, body) {
                    //Get the OAuth2 authorization code
                    helper.getAuthorization({},
                        function (error, response, body) {
                            //Assert that we have the ?code in our URL
                            assert.equal(0, response.req.path.indexOf("/?code="));
                            var code = response.req.path.slice(7, response.req.path.length);
                            //Get the token
                            helper.postOAuthCode(code,
                                function (error, response, body) {
                                    validate.validateAccessToken(response.headers, body);
                                    //Get the user info
                                    helper.getUserInfo(JSON.parse(body).access_token,
                                        function(error, response, body) {
                                            validate.validateUserJson(response.headers, body);
                                        }
                                    );
                                    done();
                                }
                            );
                        }
                    );
                }
            );
        });
        it('should give an error with an invalid client id', function (done) {
            helper.login(
                function (error, response, body) {
                    //Get the OAuth2 authorization code
                    helper.getAuthorization({clientId: 'someinvalidclientid'},
                        function (error, response, body) {
                            //assert that we are getting an error code of 400
                            assert.equal(response.statusCode, 400);
                            done();
                        }
                    );
                }
            );
        });
        it('should give an error with a missing client id', function (done) {
            helper.login(
                function (error, response, body) {
                    //Get the OAuth2 authorization code
                    request.get(
                        properties.authorization + '?redirect_uri=' + properties.redirect + "&response_type=code",
                        function (error, response, body) {
                            //assert that we are getting an error code of 400
                            assert.equal(response.statusCode, 400);
                            done();
                        }
                    );
                }
            );
        });
        it('should give an error with an invalid response type', function (done) {
            helper.login(
                function (error, response, body) {
                    //Get the OAuth2 authorization code
                    helper.getAuthorization({responseType: 'invalid'},
                        function (error, response, body) {
                            //assert that we are getting an error code of 400
                            assert.equal(response.statusCode, 400);
                            done();
                        }
                    );
                }
            );
        });
    });
});