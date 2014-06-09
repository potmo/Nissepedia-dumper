var request = require('request');
var fs = require('fs');

var allPages = {}; // using id as key and title as value


// get the parsed data as html
//http://en.wikipedia.org/w/api.php?action=parse&pageid=2012&format=json

// get unparsed content
//http://www.nissepedia.com/index.php?action=raw&title=Calbuffe

// get the categories
//http://en.wikipedia.org/w/api.php?action=query&titles=Albert%20Einstein&prop=categories&format=json

// get the links
//http://en.wikipedia.org/w/api.php?action=query&titles=Albert%20Einstein&prop=links&format=json

var addPageIfNotAdded= function(pageid, title){
	if (!allPages[pageid])
	{
		var pageEntry = {title:title, pageid: pageid, categories : [], links: [], body: ""};
		allPages[pageid] = pageEntry;
		
		curlPage(pageEntry);
	}
}

var curlPage = function(pageEntry)
{
	
	request('http://www.nissepedia.com/index.php?action=raw&title=' + pageEntry.title, function(error, response, body){
		
		pageEntry.body = body;

		writePage(pageEntry);
	});//.form({action: 'raw', title: title});
}


/**
Write the page to file
*/
var writePage = function(pageEntry)
{

	var output = JSON.stringify(pageEntry, null, "\t");

	fs.writeFile('./json/'+pageEntry.pageid+'.txt', output, function (err) {
		if (err) throw err;
		
		
		console.log(pageEntry.title + " done");

	});
}

var curlPages = function(from, num, done)
{
	request.post('http://www.nissepedia.com/api.php', function(error, response, body){
		
		var responseObject = JSON.parse(body);

		if ('query' in responseObject)
		{
			if ('allpages' in responseObject['query'])
			{
				for(var key in responseObject['query']['allpages']) { 
					var obj = responseObject['query']['allpages'][key];

					var title = obj['title'];
					var pageid = obj['pageid'];

					addPageIfNotAdded(pageid, title);
				}
			}
		}

		// see if er should continue to query. In that case we will get back this beutiful response
		if ('query-continue' in responseObject)
		{
			if ('allpages' in responseObject['query-continue'])
			{
				if ('apcontinue' in responseObject['query-continue']['allpages'])
				{
					var nextEntryStart = responseObject['query-continue']['allpages']['apcontinue'];

					curlPages(nextEntryStart, num, done);

				}
			}
		}else
		{
			console.log("final entry");
			done();
		}


	}).form({action: 'query', list: 'allpages', apfrom: from ,aplimit: num, format: 'json'});
}



curlPages('', 50, function(){
	console.log("found all: " + Object.keys(allPages).length);

});