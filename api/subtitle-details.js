const axios = require('axios');
const cheerio = require('cheerio');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  const subtitlePath = event.queryStringParameters.path;
  
  if (!subtitlePath) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Subtitle path parameter is required' })
    };
  }

  try {
    const url = subtitlePath.startsWith('http') 
      ? subtitlePath 
      : `https://www.subtitlecat.com${subtitlePath}`;
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    
    // Get subtitle title
    const title = $('.sec-title').first().text().trim();
    
    // Extract original subtitles
    const originalSubtitles = [];
    $('.all-sub').each((index, element) => {
      const text = $(element).text();
      const match = text.match(/\d+\n\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}\n[\s\S]+?(?=\n\d+\n\d{2}:\d{2}:\d{2},\d{3}|$)/g);
      if (match) {
        match.forEach(block => {
          const lines = block.trim().split('\n');
          if (lines.length >= 3) {
            originalSubtitles.push({
              index: parseInt(lines[0]),
              timestamp: lines[1],
              text: lines.slice(2).join('\n')
            });
          }
        });
      }
    });
    
    // Extract all language download links
    const languages = [];
    $('.sub-single').each((index, element) => {
      const flagImg = $(element).find('img.flag');
      const languageCode = flagImg.attr('alt') || '';
      const languageName = $(element).find('span').eq(1).text().trim();
      
      const downloadLink = $(element).find('a.green-link');
      const translateButton = $(element).find('button.yellow-link');
      
      let downloadUrl = null;
      let type = 'not_available';
      
      if (downloadLink.length) {
        downloadUrl = downloadLink.attr('href');
        type = 'download';
      } else if (translateButton.length) {
        type = 'translate_required';
      }
      
      if (languageName) {
        languages.push({
          code: languageCode,
          name: languageName,
          type: type,
          download_url: downloadUrl ? `https://www.subtitlecat.com${downloadUrl}` : null
        });
      }
    });
    
    // Get original subtitle file URL if exists
    let originalSubtitleUrl = null;
    $('script').each((index, element) => {
      const scriptContent = $(element).html();
      if (scriptContent && scriptContent.includes('translate_from_server_folder')) {
        const match = scriptContent.match(/translate_from_server_folder\(['"]([^'"]+)['"],\s*['"]([^'"]+)['"],\s*['"]([^'"]+)['"]/);
        if (match && match[2].includes('-orig.srt')) {
          originalSubtitleUrl = `https://www.subtitlecat.com${match[3]}${match[2]}`;
        }
      }
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        url: url,
        title: title,
        original_subtitles: originalSubtitles.slice(0, 20), // First 20 lines
        original_subtitle_file: originalSubtitleUrl,
        available_languages: languages,
        total_languages: languages.length
      })
    };
  } catch (error) {
    console.error('Details error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false, 
        error: 'Failed to fetch subtitle details',
        details: error.message 
      })
    };
  }
};
