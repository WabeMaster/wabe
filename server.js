/* 

Simple server (key words for "Just thrown together").  Download node.js and run "node server.js" to run a node.

*/

//"use strict";
/*process.on('uncaughtException', function(err) {
    console.log( 'uncaughtException :', err );
});*/

if('undefined'==typeof ggaesg) {console.log("success")}
var http = require('http');
var fs = require('fs');
var path = require('path');
var url = require('url');
var util=require('./util');
var crypto = require('./crypto.js');

function assert(a) {if(!a) throw("assertion failed")}

function Log(a) { console.log(a) }

Log((new Date()).getTime())

Date.prototype.secondssinceepoch=function() {return this.getTime()/1000}

{
    var reqdate=new Date();
    Log(reqdate.secondssinceepoch())
    Log(crypto.parseBigInt(crypto.sha1("hello"),16).toString(64))
    var tstring="a{}{F{}a"
    Log(crypto.s2r(tstring))
    Log(crypto.r2s(crypto.s2r(tstring)))
    assert(crypto.r2s(crypto.s2r(tstring))==tstring)

    var key=crypto.GenerateKey(128,"server")
    Log(key)
}


function Sleep(t) {
    var now = new Date().getTime();
    while(new Date().getTime() < now + t) { }
}

function IsMatch(query,entry) {
    if(typeof query != typeof entry) return
    for (i in query) {
        if(
            (typeof(query[i])=="object"&&!IsMatch(query[i],entry[i])) ||
            (query[i]!=entry[i]))
                return false;
    }
    return true;
}

function QueryDB(query,maximum) {
    var ret=[]
    for (i in database) {
        var entry=database[i];
        if(IsMatch(query,entry)&&(!maximum||ret.length<maximum)) {
            ret.push(entry);
        }
    }
    return ret;
}
database=[{pubkey:"xrep"},{pubkey:"notxrep"}]
query={pubkey:"xrep"}
console.log(QueryDB(query))
database=[]

DEBUGMODE=false

fs.readFile(process.argv[3] || "./database.json", function(err,c) {
            if(err) {
                console.log(err);
            } else {
                database=JSON.parse(c)
                console.log("Loaded database length: "+database.length)
                // Temporary time fixing code to fix old entry times.
                // this is really really not needed.
                {
                    Log("fix")
                    var curtime=0
                    for(i in database) {
                        var mindiff=2000
                        if(database[i].time<curtime) {
                            database[i].time=curtime
                        }
                        curtime=Math.max(database[i].time,curtime)+mindiff
                        //Log(curtime)
                        //Log(i)
                    }
                }

            }
        }); 


// This is probably what you're interested in:

var port=process.argv[2] || 8124;

var reqhisto={}
function TimeToHisto(t) {
    return Math.floor(t/(10));
}
function AddReqHisto() {
    var e=TimeToHisto(util.MyCurrentTime())
    reqhisto[e]=(reqhisto[e]||0)+1
}
function RecentRequests() {
    var k=TimeToHisto(util.MyCurrentTime())
    var num=0
    for(i=k;i>k-6;i--) {
        num+=reqhisto[i]||0
    }
    //Log(num)
    return num
}
AddReqHisto()
Log(reqhisto)
Log("hd")
http.createServer(function (request, response) {
    AddReqHisto()
    
    var success=false
    console.log(unescape(request.url))
    var curdate = new Date();
    
    if(request.url.length<50&&!(request.url.indexOf("..")>=0 || request.url.indexOf("//")>=0)) {
        var file='.'+request.url;
        /*if() {
            response.writeHead(500, { 'Content-Type': 'text/html'});
            response.end(cont, 'utf-8');
            return; // haxor prevention!
        }*/
        if(request.url=='/') file="index.html"
        if(path.existsSync(file)) {
            //console.log("file exists")
            
            var cont=fs.readFileSync(file)
            var ext=request.url.split('.').pop()
            
            if(ext=="txt" || ext=="js")
                response.writeHead(200, { 'Content-Type': 'text/plain', "Access-Control-Allow-Origin":"*"});
            else if(ext=="rar")
                response.writeHead(200, { 'Content-Type': 'application/octet-stream'});
            else
                response.writeHead(200, { 'Content-Type': 'text/html'});
            response.end(cont);
            return;
        }
    }
    //Sleep(50)
    var url_parts = url.parse(request.url, true);
    //console.log(url_parts.pathname)
    //console.log(request.connection.remoteAddress)

    // Generic handler, can take "/json" to get the whole database, or '/json{"signature":"avmiomdioa"}'
    if(request.url.substr(0,5)=="/json") {
        response.writeHead(200, { 'Content-Type': 'text/plain', "Access-Control-Allow-Origin":"*" });
        
        var restof=request.url.substr(5)
        var restof=unescape(url_parts.query.d);
        var parsed
        try{
            console.log(restof)
            parsed=JSON.parse(restof);
            console.log(JSON.stringify(parsed,null,4))
            
        } catch (e) {
            parsed={}
        }
        var q=QueryDB(parsed,1350);
        console.log(q.length);
        response.end(JSON.stringify(q), 'utf-8');
        return
    }
    function RespondJSON(request,j) {
        var str=JSON.stringify(j);
        response.writeHead(200, { 'Content-Type': 'text/plain', "Access-Control-Allow-Origin":"*" });
        response.end(str, 'utf-8');
        //Log("responded json: length: "+str.length)
    }
    
    var reqdate=new Date();
    if(url_parts.pathname=="/dbstats") {
        RespondJSON(request, {
            num_entries:database.length,
            last_entry_time:database.length?database[database.length-1].time:0,
            current_time:reqdate.secondssinceepoch(),
            recentrequests:RecentRequests(),
            //histo:reqhisto,
        })
    }
    
    if(url_parts.pathname=="/post") {
        try{
            
            var entrystr=url_parts.query.d;
            console.log("entry "+entrystr)
            var entry=JSON.parse(entrystr)
            entry.time=reqdate.secondssinceepoch();
            response.writeHead(200, { 'Content-Type': 'text/plain', "Access-Control-Allow-Origin":"*" });
            response.end(JSON.stringify({len:database.length}), 'utf-8');
            database.push(entry)
            console.log("new database legnth: "+database.length)
            //response.end("cb('hi')")
            fs.writeFile("./database.json", JSON.stringify(database), function(err) {
                if(err) {
                    console.log(err);
                } else {
                    console.log("The file was saved!");
                }
            }); 
            
            Log("New entry with server-added things: "+JSON.stringify(entry,null,2))
            return
         } catch (e) {
            console.log(e)
        }
    }
    // for development.
    if(DEBUGMODE && url_parts.pathname=="/reset") {
        database=[{pubkey:"root", signature: "root", message:{ comment:""}}]
    }
    
    if(url_parts.pathname=="/dbg") {
        response.writeHead(200, {'Content-Type': 'text/plain'});
        response.write(request.url+"\n")
        response.write("test\n")
        response.write(JSON.stringify(database))
        for (i in database) {
            d=database[i]
            m=d.message;
            response.write(d.pubkey+": ");
            if(m) {
                if(m.comment) {
                    response.write("says \""+m.comment+"\" ");
                    response.write("Comment id: "+m.id+" ") 
                }
                if(m.parent)
                   response.write("Parent "+m.parent)
            }
            response.write("\n");
        }
        response.end('Hello World\n');
     } else {
        response.writeHead(404, {'Content-Type': 'text/html'});
        response.end('<font face=arial size=500 color=red><h1>404<h1>\n');
     }
}).listen(port);

console.log('Server running at '+port);


