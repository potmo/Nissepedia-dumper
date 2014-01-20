
var request = require('request');
var fs = require('fs');
var md5 = require('MD5');

var allPages = {}; // using id as key and title as value
var allCategories = []; // category name

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
var formatLinksInBody = function(pageEntry)
{

	// this regexp matches the three groups
	// the first group is the title of the page that the link is pointing to
	// the second, optional, group is the display word.	
	// the thid is trailing letters that should be in the same word but is outside the link
	// e.g.  [[horse|horseshit]]s 
	// 1. horse (pagetitle)
	// 2. horsehsit (displaytitle)
	// 3. s (trailingpart)
	var linkRegexp = new RegExp('\\[\\[([^\\]\\|]*)\\|?([^\\]\\|]*?)\\]\\]([^\\s\\.,<>\'"]*)','gi');

	// if the display word exist expicitly then use that. otherwise just use the link word directly.
	pageEntry.body = pageEntry.body.replace(linkRegexp, function(original, pagetitle, displaytitle, trailingpart){

		var referenceId = getLabelReferenceFromTitle( pagetitle );
		var currentPageReferenceId = getLabelReferenceFromTitle( pageEntry.title );

		pagetitle = pagetitle.replace(/#/, ":", 'ig');
		displaytitle = displaytitle.replace(/#/, ":", 'ig');

	

		// no need to refer back to the same page 
		if (referenceId === currentPageReferenceId)
		{
			if (displaytitle)
			{			
				return displaytitle;
			}else
			{
				return pagetitle;
			}
		}

		// make sure it's not undefined
		if (!trailingpart)
		{
			trailingpart = '';
		}else
		{
			if (!displaytitle)
			{
				displaytitle = pagetitle + trailingpart;
			}
		}

		if (displaytitle)
		{
			return displaytitle + " \\textsc{(se " + pagetitle + " s.~\\pageref{"+referenceId+"})}"
		}else
		{
			return pagetitle + trailingpart + " \\textsc{(s.~\\pageref{"+referenceId+"})}"
		}
		
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

	if (allCategories.indexOf(category) === -1)
	{
		allCategories.push(category);
	}
}

/**
	removes all the [[Kategori: xxx]] from the body that is in the pageEntry.categories
*/
var formatCategoriesInBody = function(pageEntry)
{

	for (var i = 0; i < pageEntry.categories.length; i++)
	{
		var categoryRegexp = new RegExp('\\[\\[Kategori:\\s*' + pageEntry.categories[i] + '\\]\\]', 'gi');
		pageEntry.body = pageEntry.body.replace(categoryRegexp, '');
	}
}


/**
	Removes all file references
*/
var formatFilesInBody = function(pageEntry)
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

/*
	remove all <br> </br> <br/> and replace them with emptyness
*/
var cleanHtmlLinebreaks = function(pageEntry)
{
	//TODO: Do not remove bold and italic. just make it somehow different from the title
	var linebreak = new RegExp('<\\s*\\\\?\\s*(br)\\s*\\\\?\\s*>','gi');
	pageEntry.body = pageEntry.body.replace(linebreak, '');
}

/*
	bold is '''something''' in wiki markup
	but it is \textbf{something} in latex
*/
var formatBoldInBody = function(pageEntry)
{

	var regexp;

	//also replace html tags
	regexp = new RegExp("<\s*b\s*[^>]*>(.*?)<\s*/\s*b\s*>", 'gi');
	pageEntry.body = pageEntry.body.replace(regexp, function(original, group0) {
		return "'''" + group0 + "'''";
	});

	// bold is '''something''' in wiki markup
	regexp = new RegExp("[']{3}([^']*?)[']{3}",'gi');

	pageEntry.body = pageEntry.body.replace(regexp, function(original, group0) {
		return "\\textbf{" + group0 + "}";
	});

	
	
}

/*
	italic is ''something'' in wiki markup
	but it is \textit{something} in latex
*/
var formatItalicInBody = function(pageEntry)
{
	var regexp

	//also replace html tags
	regexp = new RegExp("<\s*i\s*[^>]*>(.*?)<\s*/\s*i\s*>", 'gi');
	pageEntry.body = pageEntry.body.replace(regexp, function(original, group0 ) {
		return "''" + group0 + "''";
	});

	
	regexp = new RegExp("[']{2}([^'{2}]*?)[']{2}",'gi');
	pageEntry.body = pageEntry.body.replace(regexp, function(original, group0) {
		return "\\textit{" + group0 + "}";
	});

	
	
}

/*

	quotes is "something" in wiki markup
	but it is ``something'' in latex

*/
var formatDoubleQuotesInBody = function(pageEntry)
{

	var regexp = new RegExp('"([^"]*?)"','gi');

	pageEntry.body = pageEntry.body.replace(regexp, function(original, group0) {
		return "``" + group0 + "''";
	});
	
}

var formatHeadingsInBody = function(pageEntry)
{
	/*		\section{Section Headings}		*/
	/*		===Manifestet===  				*/

	var regexp;

	regexp = new RegExp("[=]{4}([^=]*?)[=]{4}",'gi');
	pageEntry.body = pageEntry.body.replace(regexp, function(original, group0) {
		return "HEAD4: " + group0 + "";
	});

	regexp = new RegExp("[=]{3}([^=]*?)[=]{3}",'gi');
	pageEntry.body = pageEntry.body.replace(regexp, function(original, group0) {
		return "HEAD3: " + group0 + "";
	});

	regexp = new RegExp("[=]{2}([^=]*?)[=]{2}",'gi');
	pageEntry.body = pageEntry.body.replace(regexp, function(original, group0) {
		return "HEAD2: " + group0 + "";
	});

}

var formatUnorderedListsInBody = function(pageEntry)
{

	var lines = pageEntry.body.split('\n');

	var output = "";

	var currentDepth = 0;

	for (lineIndex in lines)
	{
		var line = lines[lineIndex];
		
		var oldDepth = currentDepth;
		//var currentDepth = new RegExp('^\\h?\\*{' +1+ '}[^\\*]+$', 'm');
		var regexp = new RegExp('^\\s?(\\**?)([^\\*]+.*?)$', 'm');
		var result = regexp.exec(line);

		currentDepth = result ? result[1].length : 0;
		line = result ? ' ' + result[2].trim() : line;

		while (oldDepth < currentDepth)
		{
			output += '\\begin{itemize}\n';
			oldDepth++;
		}

		if (currentDepth !== 0)	
		{
			output += '\\item' + line + '\n';
		}

		while (oldDepth > currentDepth)
		{
			output += '\\end{itemize}\n';
			oldDepth--;
		}	

		if (currentDepth === 0)
		{
			output += line + '\n';
		}
	}

	while (currentDepth > 0)
	{
		output += '\\end{itemize}\n';
		currentDepth--;
	}


	pageEntry.body = output;
	
}

var formatOrderedListsInBody = function(pageEntry)
{

	var lines = pageEntry.body.split('\n');

	var output = "";

	var currentDepth = 0;

	for (lineIndex in lines)
	{
		var line = lines[lineIndex];
		
		var oldDepth = currentDepth;
		//var currentDepth = new RegExp('^\\h?\\*{' +1+ '}[^\\*]+$', 'm');
		var regexp = new RegExp('^\\s?(\\#*?)([^\\#]+.*?)$', 'm');
		var result = regexp.exec(line);

		currentDepth = result ? result[1].length : 0;
		line = result ? ' ' + result[2].trim() : line;

		while (oldDepth < currentDepth)
		{
			output += '\\begin{enumerate}\n';
			oldDepth++;
		}

		if (currentDepth !== 0)	
		{
			output += '\\item' + line + '\n';
		}

		while (oldDepth > currentDepth)
		{
			output += '\\end{enumerate}\n';
			oldDepth--;
		}	

		if (currentDepth === 0)
		{
			output += line + '\n';
		}
	}

	while (currentDepth > 0)
	{
		output += '\\end{enumerate}\n';
		currentDepth--;
	}


	pageEntry.body = output;
	
}

var cleanRedirects = function(pageEntry)
{
	//TODO: Add a link instead fo just removing it
	pageEntry.body = pageEntry.body.replace(/#OMDIRIGERING/, '', 'g');
}

/*
	If the article starts with the title we can drop that so it doesn't repeat itself
*/
var removeInitialTitleFromBody = function(pageEntry)
{

	var lines = pageEntry.body.split('\n');
	var first = lines[0];

	// clean up the title so that it is safe to push into a regep
	var regexpSafeTitle = pageEntry.title;
	regexpSafeTitle = regexpSafeTitle.replace(/\(/g, '\\(');
	regexpSafeTitle = regexpSafeTitle.replace(/\)/g, '\\)');
	regexpSafeTitle = regexpSafeTitle.replace(/\*/g, '\\*');

	//JO))))N
	
	// match start of line
	var cleanRegexp = new RegExp('^' + regexpSafeTitle + '', 'i');
	first = first.replace(cleanRegexp, '');

	var quoteRegexp = new RegExp('^``' + cleanTitleFromQuotations(regexpSafeTitle) + '\'\'', 'i');
	first = first.replace(quoteRegexp, '');

	var boldRegexp = new RegExp('^\\\\textbf{' + cleanTitleFromQuotations(regexpSafeTitle) + '}', 'i');
	first = first.replace(boldRegexp, '');

	
	lines[0] = first;

	pageEntry.body = lines.join('\n');
}

var addTitleToBody = function(pageEntry)
{
	// add title
	pageEntry.body = "\\textbf{" + cleanTitleFromQuotations(pageEntry.title) + "}\n" + pageEntry.body;
}

var addLabelToBody = function(pageEntry)
{
	// add title
	pageEntry.body = "\\label{" + getLabelReferenceFromTitle(pageEntry.title) + "}\n" + pageEntry.body;
}

var addIndexToBody = function(pageEntry)
{
	for (category in pageEntry.categories)
	{
		pageEntry.body = "\\index[" + pageEntry.categories[category].replace(" ", "_", 'g') + "]{" + pageEntry.title + "}\n" + pageEntry.body;
	}
}



var getLabelReferenceFromTitle = function(title)
{

	title = title.toLowerCase();
	title = cleanTitleFromQuotations(title);
	title = title.trim();
	title = md5(title);
	return title;
}

var cleanTitleFromQuotations = function(title)
{
	if (title.charAt(0) === '"' && title.charAt(title.length-1) === '"')
	{
		return title.substring(1, title.length-1 );
	}else
	{
		return title;
	}
}

var wrapBodyArticleWrapping=function(pageEntry)
{
	pageEntry.body = "\\small{\n" + pageEntry.body + "}\n\n";
}

var cleanBodyFromSpecialCharacters = function(pageEntry)
{
	pageEntry.body = pageEntry.body.replace(/#/g, '\\#');
	pageEntry.body = pageEntry.body.replace(/\$/g, '\\$');
	pageEntry.body = pageEntry.body.replace(/%/g, '\\%');
	pageEntry.body = pageEntry.body.replace(/&/g, '\\&');
	pageEntry.body = pageEntry.body.replace(/</g, '\\textless');
	pageEntry.body = pageEntry.body.replace(/>/g, '\\textgreater');
	pageEntry.body = pageEntry.body.replace(/£/g, '\\punds');
	pageEntry.body = pageEntry.body.replace(/\|/g, '\\textbar');
	//pageEntry.body = pageEntry.body.replace(/\\/g, '\\textbackslash');
}



var formatPageEntryToLatex = function(pageEntry)
{
	trimBody(pageEntry);

	formatFilesInBody(pageEntry);
	trimBody(pageEntry);

	addCategories(pageEntry);
	formatCategoriesInBody(pageEntry);

	addLinks(pageEntry);
	formatLinksInBody(pageEntry);

	formatBoldInBody(pageEntry);
	formatItalicInBody(pageEntry);
	formatDoubleQuotesInBody(pageEntry);
	formatHeadingsInBody(pageEntry);

	cleanHtmlLinebreaks(pageEntry);
	trimBody(pageEntry);
	cleanRedirects(pageEntry);
	trimBody(pageEntry);
	removeInitialTitleFromBody(pageEntry);
	trimBody(pageEntry);
	formatUnorderedListsInBody(pageEntry);
	formatOrderedListsInBody(pageEntry);

	// addIndexToBody(pageEntry);
	addLabelToBody(pageEntry);
	addTitleToBody(pageEntry);

	cleanBodyFromSpecialCharacters(pageEntry);

	wrapBodyArticleWrapping(pageEntry);
}


/**
Write the page to file
*/
var writePage = function(pageEntry)
{



	
	//formatPageEntryToLatex(pageEntry);
	//var output = pageEntry.body;

	var output = JSON.stringify(pageEntry, null, "\t");

	fs.writeFile('./out/'+pageEntry.pageid+'.txt', output, function (err) {
		if (err) throw err;
		
		
		console.log(pageEntry.title + " done");
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
				if ('apcontinue' in responseObject['query-continue']['allpages'])
				{
					var nextEntryStart = responseObject['query-continue']['allpages']['apcontinue'];

					// curl next block
					curlPages(nextEntryStart, num, done);
					//done();

				}
			}
		}else
		{
			console.log("final entry");
			done();
		}


	}).form({action: 'query', list: 'allpages', apfrom: from ,aplimit: num, format: 'json'});
}

var convertToLatex = function(done)
{

	// read directory
	fs.readdir("./out/", function(err, files){
		if (err) throw err;

		console.log("reading dir done: " + files.length);

		convertFile(files, [], function(convertedEntries)
		{

			console.log("converting files done: " + convertedEntries.length);

			convertedEntries.sort(function (a, b) {
			    return cleanTitleFromQuotations(b.title.toLowerCase()).localeCompare(cleanTitleFromQuotations(a.title.toLowerCase()), 'sv');
			});

			console.log("sorting files done: " + convertedEntries.length);

			writeFiles(convertedEntries, 0, function()
			{

				console.log("writing files done: " + convertedEntries.length);

				done();
			});
		});
		
	});
}

var convertFile = function(files, entries, done)
{
	if (files.length === 0)
	{
		done(entries);
		return;
	}

 	var file = files.pop();

 	// do not handle non txt files
 	if (file.indexOf('.txt', file.length - '.txt'.length) === -1)
 	{
 		convertFile(files, entries, done);
 		return;
 	}


	//console.log("reading " + file);

	fs.readFile("./out/" + file, 'utf8' ,function (err, data) {
		if (err) throw err;

		// check file ending
		var convertedPageEntry = JSON.parse(data);

		try{
			formatPageEntryToLatex(convertedPageEntry);
		}catch(error)
		{
			console.error("Crashed formatting: " + data);
			throw error;
		}

		entries.push(convertedPageEntry);
		
		convertFile(files, entries, done);
		
	});
	
}

var writeFiles = function(entries, num, done)
{

	if (entries.length === 0)
	{
		done();
		return;
	}

	var convertedPageEntry = entries.pop();

	var output = convertedPageEntry.body;

	var fileNum = '' + num;

	while(fileNum.length < 6)
	{
		fileNum = '0' + fileNum;
	}

	fs.writeFile('./latex/articles/'+fileNum+'.texpart', output, function (err) {

		num++;
		writeFiles(entries, num, done);
	
	});

}

convertToLatex(function(){
		console.log("done converting");
	});

return;


curlPages('', 50, function(){
	console.log("found all: " + Object.keys(allPages).length);


	convertToLatex(function(){
		console.log("done converting");
	});


});
