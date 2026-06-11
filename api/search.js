const axios = require('axios');
const cheerio = require('cheerio');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  const searchQuery = event.queryStringParameters.q || event.queryStringParameters.search;
  
  if (!searchQuery) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Search query parameter "q" is required' })
    };
  }

  try {
    const url = `https://www.subtitlecat.com/index.php?search=${encodeURIComponent(searchQuery)}`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const subtitles = [];

    $('.sub-table tbody tr').each((index, element) => {
      const titleElement = $(element).find('td:first-child a');
      const title = titleElement.text().trim();
      const href = titleElement.attr('href');
      
      const size = $(element).find('.sub-table__metric-value').first().text().trim();
      const downloads = $(element).find('td').eq(3).text().trim();
      const languages = $(element).find('td').eq(4).text().trim();
      
      // Check for thumb up emoji/icon
      const hasThumbUp = $(element).find('td:first-child i.fa-thumbs-up, td:first-child').html()?.includes('thumbs-up') || false;

      if (title && href) {
        subtitles.push({
          title: title,
          relative_url: href,
          full_url: `https://www.subtitlecat.com${href}`,
          size: size,
          downloads: parseInt(downloads) || 0,
          languages: parseInt(languages) || 0,
          featured: hasThumbUp
        });
      }
    });

    // Get total count
    const totalText = $('.sec-title').first().text();
    const totalMatch = totalText.match(/(\d+)\s+subtitles? found/);
    const totalFound = totalMatch ? parseInt(totalMatch[1]) : subtitles.length;
    
    const totalSubtitlesText = $('.sec-title span').first().text();
    const totalSubtitlesMatch = totalSubtitlesText.match(/(\d+(?:,\d+)*)\s+subtitles/);
    const totalSubtitles = totalSubtitlesMatch ? parseInt(totalSubtitlesMatch[1].replace(/,/g, '')) : null;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        query: searchQuery,
        results: {
          total_found: totalFound,
          total_subtitles_in_database: totalSubtitles,
          items: subtitles
        }
      })
    };
  } catch (error) {
    console.error('Search error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false, 
        error: 'Failed to fetch search results',
        details: error.message 
      })
    };
  }
};
