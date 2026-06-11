const axios = require('axios');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  const downloadPath = event.queryStringParameters.path;
  
  if (!downloadPath) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Download path parameter is required' })
    };
  }

  try {
    const url = downloadPath.startsWith('http') 
      ? downloadPath 
      : `https://www.subtitlecat.com${downloadPath}`;
    
    const response = await axios.get(url, {
      responseType: 'text',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    // Return the subtitle content
    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="subtitle-${Date.now()}.srt"`
      },
      body: response.data
    };
  } catch (error) {
    console.error('Download error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false, 
        error: 'Failed to download subtitle',
        details: error.message 
      })
    };
  }
};
