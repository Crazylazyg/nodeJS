var http = require('http')
var https = require('https')

var url = require('url')
var config = require('./config')

var StringDecoder = require('string_decoder').StringDecoder;
var fs = require('fs')

var httpServer = http.createServer(function(req,res){
  unifiedServer(req,res)
});

httpServer.listen(config.httpPort,function(){
  console.log('The HTTP server is running on port '+ config.httpPort)
})

const httpsServerOptions = {
  'key':fs.readFileSync('./https/key.pem'),
  'cert':fs.readFileSync('./https/cert.pem'),
}

var httpsServer = https.createServer(httpsServerOptions,function(req,res){
  unifiedServer(req,res)
})

httpsServer.listen(config.httpsPort,function(){
  console.log('The HTTPS server is running on port '+ config.httpsPort)
})

var handlers = {};

// Sample handler
handlers.ping = function(data, callback){
  callback(200)
}

handlers.sample = function(data,callback){
    callback(406,{'name':'sample handler'});
};

// Not found handler
handlers.notFound = function(data,callback){
  callback(404);
};

// Define the request router
var router = {
  'sample' : handlers.sample,
  'ping': handlers.ping
};

let unifiedServer = (req,res) => {
  const parsedUrl =url.parse(req.url,true),
        path = parsedUrl.pathname,

        trimmedPath = path.replace(/^\/+|\/+$/g,''),
        queryStirngObject = parsedUrl.query

        method = req.method.toLowerCase(),
        headers = req.headers,

        decoder = new StringDecoder('utf-8')

  let buffer = ''

  req.on('data', function(data){
    buffer += decoder.write(data)
  })
  req.on('end', function(){
    buffer += decoder.end()
    let chosenHandler = typeof(router[trimmedPath]) !== 'undefined'
                        ? router[trimmedPath]
                        : handlers.notFound
    let data = {
      trimmedPath,
      queryStirngObject,
      method,
      headers,
      payload: buffer
    }

    chosenHandler(data,function(statusCode, payload){
      statusCode = typeof statusCode === 'number'
                                          ? statusCode
                                          : 200

      payload = typeof payload === 'object'
                                    ? payload
                                    : {}

      const payloadString = JSON.stringify(payload)

      res.setHeader('Content-Type','application/json')
      res.writeHead(statusCode)
      res.end(payloadString)
      console.log('Returning this response: ', statusCode, payloadString)
    })
  })
}