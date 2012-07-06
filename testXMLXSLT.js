/*
    Testing the ability to do xslt transformations in node.js 
*/
var http = require('http');
var xslt = require('node_xslt');


var string = '<?xml version="1.0" encoding="ISO-8859-1"?>' + '<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">' + '<xsl:template match="/">' + '  <html>' + '  <body>' + '  <h2>My CD Collection</h2>' + '  <table border="1">' + '    <tr bgcolor="#9acd32">' + '      <th>Title</th>' + '      <th>Artist</th>' + '    </tr>' + '    <xsl:for-each select="catalog/cd">' + '    <tr>' + '      <td><xsl:value-of select="title"/></td>' + '      <td><xsl:value-of select="artist"/></td>' + '    </tr>' + '    </xsl:for-each>' + '  </table>' + '  </body>' + '  </html>' + '</xsl:template>' +

'</xsl:stylesheet>';


var stylesheet = xslt.readXsltString(string);

var document = xslt.readXmlString('<?xml version="1.0" encoding="UTF-8"?>' + '<catalog>' + ' <cd>' + '    <title>Orby sings the blues</title>' + '    <artist>Jon Arlov Sings the blues</artist>' + '    <country>USA</country>' + '   <company>Columbia</company>' + '    <price>10.90</price>' + '   <year>1985</year>' + ' </cd>' + '</catalog>');

var params = [];
var transformedString = xslt.transform(stylesheet, document, params);


http.createServer(function(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/html'
    });
    res.end(transformedString);
}).listen(process.env.PORT);