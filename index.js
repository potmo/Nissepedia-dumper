
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
generic find metadata (i.e. [[Maybesomething: something|maybe]])
**/
var addMetadata = function(type, pageEntry, list )
{
	if (type !== '') type = type + ":";

	// this regexp exposes the one or two groups
	// the first group is the title of the page that the link is pointing to
	// the second, optional, group is the display word.
	var linkRegexp = new RegExp('\\[\\[' + type + '\\s*([^\\]\\|]*)\\|?([^\\]\\|]*?)\\]\\]','gi');
	
	// find all the matches
	while ((matches = linkRegexp.exec(pageEntry.body)) !== null)
	{
		// first take the dataName (the page title) and then if that does not exist select the second that is the display.
		var dataName = matches[1] ? matches[1] : matches[2];
		addMetadataIfNotAdded(list, dataName);
	}
}

var addMetadataIfNotAdded = function(list, metadata)
{
	metadata = metadata.toLowerCase();

	if (list.indexOf(metadata) === -1)
	{
		list.push(metadata);
	}
}

/**
Searches for all links in the body and adds them to the pageEntry.links
*/
var addLinks = function(pageEntry)
{

	// links does not have any name to it
	//addMetadata('', pageEntry, pageEntry.links);

	
	// this regexp exposes the one or two groups
	// the first group is the title of the page that the link is pointing to
	// the second, optional, group is the display word.
	var linkRegexp = new RegExp('\\[\\[([^\\]\\|]*)\\|?([^\\]\\|]*?)\\]\\]','gi');
	
	// find all the matches
	while ((matches = linkRegexp.exec(pageEntry.body)) !== null)
	{
		addLinkIfNotAdded(pageEntry, matches[1]);
	}
	
}

/** 
Add the category if it is not already added. Ignore case
**/
var addLinkIfNotAdded = function(pageEntry, link)
{
	link = link.toLowerCase();

	if (pageEntry.links.indexOf(link) === -1)
	{
		pageEntry.links.push(link);
	}
}

/**
removes all the [[xxx]] from the body that is in the pageEntry.links
*/
var cleanBodyOfLinks = function(pageEntry)
{

	// this regexp exposes the one or two groups
	// the first group is the title of the page that the link is pointing to
	// the second, optional, group is the display word.	
	var linkRegexp = new RegExp('\\[\\[([^\\]\\|]*)\\|?([^\\]\\|]*?)\\]\\]','gi');

	// if the display word exist expicitly then use that. otherwise just use the link word directly.
	pageEntry.body = pageEntry.body.replace(linkRegexp, function(x,a,b){
		return b ? b : a;
	});
}


/**
Searches for all categories in the body and adds them to the pageEntry.categories
*/
var addCategories = function(pageEntry)
{
	var catagoryRegexp = new RegExp('\\[\\[Kategori:\\s*([^\\]]*?)\\]\\]','gi');

	// find all the matches
	while ((matches = catagoryRegexp.exec(pageEntry.body)) !== null)
	{
		addCategoryIfNotAdded(pageEntry, matches[1]);
	}
}

/** 
Add the category if it is not already added. Ignore case
**/
var addCategoryIfNotAdded = function(pageEntry, category)
{
	category = category.toLowerCase();

	if (pageEntry.categories.indexOf(category) === -1)
	{
		pageEntry.categories.push(category);
	}
}

/**
removes all the [[Kategori: xxx]] from the body that is in the pageEntry.categories
*/
var cleanBodyOfCategories = function(pageEntry)
{

	for (var i = 0; i < pageEntry.categories.length; i++)
	{
		var categoryRegexp = new RegExp('\\[\\[Kategori:\\s*' + pageEntry.categories[i] + '\\]\\]', 'gi');
		pageEntry.body = pageEntry.body.replace(categoryRegexp, '');
	}
}


var cleanBodyOfFiles = function(pageEntry)
{
	var fileRegexp = new RegExp('\\[\\[Fil:\\s*([^\\]]*?)\\]\\]','gi');
	pageEntry.body = pageEntry.body.replace(fileRegexp, '');
}

/**
removes all whitespace before and after the body text in pageEntry.body
*/
var trimBody = function(pageEntry)
{
	pageEntry.body = pageEntry.body.trim();
}

var cleanHtmlLinebreaks = function(pageEntry)
{
	//TODO: Do not remove bold and italic. just make it somehow different from the title
	var linebreak = new RegExp('<\\s*\\\\?\\s*(br|b|i)\\s*\\\\?\\s*>','gi');
	pageEntry.body = pageEntry.body.replace(linebreak, '');
}


/**
Write the page to file
*/
var writePage = function(pageEntry)
{

	cleanBodyOfFiles(pageEntry);

	addCategories(pageEntry);
	cleanBodyOfCategories(pageEntry);

	addLinks(pageEntry);
	cleanBodyOfLinks(pageEntry);

	cleanHtmlLinebreaks(pageEntry);

	trimBody(pageEntry);

	//TODO: Take care of the groups. Maybe as a see also?

	var fixedBody = pageEntry.title + " - - - - - - - - - - - - - - - - - - - - \n"  + pageEntry.body + "\n" + "se även: " + pageEntry.links.join(", ") + "\n" + "kategorier: " + pageEntry.categories.join(", ") + "\n\n" ;

	fs.writeFile('./out/'+pageEntry.pageid+'.txt', fixedBody, function (err) {
		if (err) throw err;
		
		console.log('SAVED-#-#-#-#-#-#-#-#-#-#-#-#-#-#-#-#-#-#-#-#-#-#-#-#-#-#-');
		console.log(fixedBody);
		/*console.log(pageEntry.title + '(' + pageEntry.pageid + ')');
		console.log(pageEntry.body);
		console.log("se även: " + pageEntry.links.join(", "));
		console.log("kategorier: " + pageEntry.categories.join(", "));
		console.log('');*/
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

					// remove heading and trailing quotations
					//title = title.substring(1, title.length - 1); 

					addPageIfNotAdded(pageid, title);
				}
			}
		}

		// see if er should continue to query. In that case we will get back this beutiful response
		if ('query-continue' in responseObject)
		{
			if ('allpages' in responseObject['query-continue'])
			{
				if ('apfrom' in responseObject['query-continue']['allpages'])
				{
					var nextEntryStart = responseObject['query-continue']['allpages']['apfrom'];
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

curlPages('', 400, function(){
	console.log("found all: " + Object.keys(allPages).length);
});
