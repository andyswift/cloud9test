/**
 * Demonstrates the ability to set up a http server that
 * performs a remote search against the enhetsregisteret in the DIFI data hotel
 * and displays a list of results
 */
var http = require('http');
var events = require('events');
var querystring = require("querystring");
var url = require("url");

//used for firing status event
var statusEmitter = new events.EventEmitter();

/**
 * Searches for the organisation specified by the query
 * 
 * @param query 
 * { 
 *  query : "searchTerm" 
 * }
 * 
 * or 
 * { 
 *  orgnr : 987654321 
 * }
 * 
 */
function searchForOrganisation(query) {
    
    //converts the provided query object to a query string
    var endcodedQueryString = querystring.stringify(query);

    //set up the options required for making the remote http request
    var options = {
        host: "hotell.difi.no",
        path: "/api/json/brreg/enhetsregisteret?" + endcodedQueryString,
        method: "GET",
        headers: {
            "user-agent": "Node.js brreg-search client"
        }
    };

    console.log("Creating request to " + options.path);

    //Creates the object which is used to make the http request.
    var request = http.request(options);
    
    //response happens async so we need to read all the response into the body
    //string, parse it as JSON and then emit an event saying that we have got the status
    request.addListener("response", function(response) {
        var body = "";
        response.addListener("data", function(data) {
            body += data;
        });

        //log error messages
        response.addListener("error", function(error) {
            console.log(error);
        });

        response.addListener("end", function() {

            var status = JSON.parse(body);
            statusEmitter.emit("status", status);
        });
    });
    
    //log error messages
    request.addListener("error", function(error) {
        console.log(error);
    });

    request.end();
}


/* Object factory which creates new searchResultListeners 
for a given http response */
var searchResultListener = { 
    
    createNew : function(res) {
        //returns a function which is the searchResultListener.
        return function (status) {
            
            //Used to store the htmlResult as a string.
            var htmlResult;
            
            //if there are no hits display no hits
            if (!status || !status.posts) {
                htmlResult = "<p>No hits</p>";
            }
            else {
        
                htmlResult = "<p>Found " + status.posts + "</p>";
                htmlResult = "<ul>";
                for (var i = 0; i < status.entries.length; i++) {
                    var entry = status.entries[i];
                    htmlResult += "<li>" + entry.navn + " ";
                    htmlResult += "" + entry.orgnr + "</li>";
                }
                htmlResult += "</ul>";
            }
        
            //write out the html response.
            res.writeHead(200, {
                'Content-Type': 'text/html'
            });
            res.write(htmlResult, "UTF-8");
            res.end();
        }
    }
};


/* Cloud9 requires the port to be set to this value
   when running locally this value is undefined so 
   we need to provide a value. */
var port = process.env.PORT || 8080;

/* Sets up the server which is responsible for serving the requests.
   This server will serve all requests made to /organistaion/
   A remote call will be made to difi to search for the organisation provided
   A simple html list is returned. */
http.createServer(function(req, res) {
    var organisationName, url_parts, matches;
    var queryPattern = /^\/organisation\/([^\/]+)$/;

    //extracts the search term from all urls starting with /organisation/<search term>
    url_parts = url.parse(req.url, true);
    matches = queryPattern.exec(url_parts.pathname);

    if (!matches || !matches[1]) {
        res.writeHead(400, "No organisation provided", {
            'Content-Type': 'text/html'
        });
        res.write("you need to make a request of form /organisation/name E.g. <a href='/organisation/SendRegning'>Search for SendRegning</a>");
        res.end();
        return;
    }

    //got the organisation name
    organisationName = matches[1];

    //Attaches our search result listener to the status event which is emitted when search results are available.
    //n.b. we pass the response object so the listener can write to and close the response when receiving result 
    //from remote call.
    statusEmitter.addListener("status", searchResultListener.createNew(res));

    //perform the async search at difi
    searchForOrganisation({
        query: organisationName
    });

}).listen(port);

console.log("Started server on port " + port)