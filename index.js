const fs = require('fs').promises
const axios = require('axios')
const jquery = require('jquery')
const { JSDOM } = require('jsdom')

const url = 'https://www.crossword.one/pag_from_word_to_definition.asp'

async function main() {
	const words = []
	let response = await axios.get(url)
	let parsed = parseWordsFromHtml(response.data)
	words.push(...parsed.words)
	const cookie = response.headers['set-cookie'][0].split(';')[0]
	while (parsed.currentPage < parsed.totalPages) {
		console.log(`Fetched page ${parsed.currentPage} of ${parsed.totalPages}`)
		response = await axios({
			method: 'post',
			url: url,
			headers: {
				'content-type': 'application/x-www-form-urlencoded',
				'cookie': cookie
			},
			data: {
				'fpdbr_0_PagingMove': '  >   ',
				'Parola': ''
			}
		})
		const previousPage = parsed.currentPage
		parsed = parseWordsFromHtml(response.data)
		if (parsed.currentPage == previousPage) {
			console.error("Error: unable to reach netx page, probably too many request")
			break
		}
		words.push(...parsed.words)
	}
	// write words to file
	console.log('Writing words to file words.json')
	await fs.writeFile('words.json', JSON.stringify(words, null, 2))
}

function parseWordsFromHtml(html) {
	const dom = new JSDOM(html)
	const $ = jquery(dom.window)
	const words = []
	$('#box-1 tbody:last tr').each(function() {
		const word = $(this).find('td:first').text().trim()
		const definitions = $(this).find('td:last pre').text().split('\n').map(item => item.trim()).filter(item => !!item)
		words.push({word, definitions})
	})
	const [currentPage, totalPages] = words.pop().word.match(/\d+/g).map(Number)
	if (!currentPage || !totalPages) {
		throw new Error("Unable to parse paging info")
	}
	return {words, currentPage, totalPages}
}

main()
