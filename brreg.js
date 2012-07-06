var http = require('http');
var events = require('events');
var querystring = require("querystring");
var url = require("url");

//used for firing status event
var statusEmitter = new events.EventEmitter();  

function searchForOrganisation(query) {  
    var endcodedQueryString = querystring.stringify(query);
    
    var options = {
		host: "hotell.difi.no",
		path: "/api/json/brreg/enhetsregisteret?" + endcodedQueryString,
		method : "GET",
		headers : {
            "Accept-Charset": "utf-8",
			"user-agent" : "Node.js brreg-search client"
		}
	};

    console.log("Creating request to " + options.path); 

	//create the request object for fetching the status
    var request = http.request(options);
	//request happens async so we need to read all the response into the body
	//string parse it from JSON and then emit an event saying that we have got the status
	request.addListener("response", function(response) {  
        var body = "";  
        response.addListener("data", function(data) {  
            body += data;  
        });  

        response.addListener("error", function(error) {  
            console.log(error);  
        });  

        response.addListener("end", function() {  
			
            var status = JSON.parse(body);
            statusEmitter.emit("status", status);  
        });  
    });  
    
    request.addListener("error", function(error){
        console.log(error);
    });

    request.end();  
}  

var port = process.env.PORT || 8080;
http.createServer(function (req, res) {
    /* 
        This server will serve all requests made to /organistaion/
        A remote call will be made to difi to search for the organisation provided
        A simple html list is returned.
    */
    var searchResultListener = function(status){
        
        var htmlResult;
        
        if(!status || !status.posts){
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
        
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.write(htmlResult,"UTF-8");
        res.end();
    };
    
    //extracts the search term from all urls starting with /organisation/<search term>
    var queryPattern = /^\/organisation\/([^\/]+)$/;
    var url_parts = url.parse(req.url, true);    
    var matches = queryPattern.exec(url_parts.pathname);
    
    if(!matches || !matches[1]){
        res.writeHead(400, "No organisation provided", {'Content-Type': 'text/html'});
        res.write("you need to make a request of form /organisation/name E.g. <a href='/organisation/SendRegning'>Search for SendRegning</a>");
        res.end();
        return;
    }
    
    //got the organisation name
    var organisationName = matches[1];
  
   //Attaches our search result listener to the status event which is emitted when search results are available.
    statusEmitter.addListener("status",searchResultListener)

    //perform the async search at difi
    searchForOrganisation({query : organisationName });   
   
}).listen(port);

console.log("Started server on port " + port)


